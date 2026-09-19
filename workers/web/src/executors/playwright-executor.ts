import { randomUUID } from 'node:crypto';

import type { BrowserContext } from 'playwright';
import type {
  TestExecutionArtifact,
  TestExecutionContext,
  TestExecutionResult,
  TestExecutionResultItem,
  TestExecutor,
} from '@qavio/queue';

import { withBrowserContext, type BrowserManagerOptions } from '../browser-manager';
import { discoverLinks, normalizeUrl } from '../crawler/discover-links';
import { runPageCheck, type PageCheckOutcome } from '../checks/run-page-check';
import { installRouteGuard } from '../security/route-guard';
import { validateTargetUrl } from '../security/target-validation';
import { looksLikeAuthBoundary, resolveAuthContext } from '../security/auth-context';

export interface PlaywrightExecutionTarget {
  baseUrl: string;
  authMethod: 'none' | 'stored_state' | 'credentials';
  authCredentialId: string | null;
}

export interface PlaywrightTestExecutorDeps {
  /** Loads the environment's base URL and authentication configuration fresh from the database — never trust anything carried in the queue payload (see docs/test-run-engine.md). `null` means the project/environment isn't a valid, currently-usable target. */
  resolveTarget(context: TestExecutionContext): Promise<PlaywrightExecutionTarget | null>;
  /** Loads a credential's secret value, scoped to the run's own organization/project (see repository.loadCredentialSecret — authorization happens there, not in this function). `null` if the credential doesn't exist or doesn't belong to that org/project. */
  loadCredentialSecret(organizationId: string, projectId: string, credentialId: string): Promise<string | null>;
  /** A handful of named milestones only (launching, checking page N of M) — never per-network-event, so this stays cheap on the Realtime channel it rides. */
  onProgress(context: TestExecutionContext, message: string): Promise<void>;
  /** Server-side only. Defaults to `true`; a developer can flip it locally to watch the crawl run. */
  headless?: boolean;
  /** Populated only from `PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST` — see `ValidateTargetUrlOptions.allowedTestHosts`. Unset (and therefore empty) in every deployed environment. */
  allowedTestHosts?: ReadonlySet<string>;
}

export interface CrawlLimits {
  maxPages: number;
  maxDepth: number;
  maxDurationMs: number;
  navigationTimeoutMs: number;
  failOnConsoleError: boolean;
}

/** Deliberately conservative — this is a background worker crawling a real site unattended; see docs/test-run-engine.md's "Resource limits" section. A run's `configuration` can request smaller values but never larger ones than MAX_LIMITS. */
const DEFAULT_LIMITS = { maxPages: 15, maxDepth: 2, maxDurationMs: 120_000, navigationTimeoutMs: 15_000 };
const MAX_LIMITS = { maxPages: 30, maxDepth: 5, maxDurationMs: 300_000, navigationTimeoutMs: 30_000 };
const MIN_DURATION_MS = 1_000;
const MIN_NAVIGATION_TIMEOUT_MS = 1_000;

/** How often a running crawl is allowed to write `test_runs.progress` — a page-by-page update on a 15-page crawl would otherwise flood the same Realtime channel the status badge relies on. */
const PROGRESS_THROTTLE_MS = 2_000;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function readCrawlLimits(configuration: Record<string, unknown>): CrawlLimits {
  return {
    maxPages: clampNumber(configuration.maxPages, DEFAULT_LIMITS.maxPages, 1, MAX_LIMITS.maxPages),
    maxDepth: clampNumber(configuration.maxDepth, DEFAULT_LIMITS.maxDepth, 0, MAX_LIMITS.maxDepth),
    maxDurationMs: clampNumber(configuration.maxDurationMs, DEFAULT_LIMITS.maxDurationMs, MIN_DURATION_MS, MAX_LIMITS.maxDurationMs),
    navigationTimeoutMs: clampNumber(
      configuration.navigationTimeoutMs,
      DEFAULT_LIMITS.navigationTimeoutMs,
      MIN_NAVIGATION_TIMEOUT_MS,
      MAX_LIMITS.navigationTimeoutMs,
    ),
    failOnConsoleError: configuration.failOnConsoleError === true,
  };
}

/** Races a page check against the run's own abort signal, so a cancellation mid-navigation doesn't have to wait out the full navigation timeout before the crawl loop notices — see docs/test-run-engine.md's Cancellation section. The browser context itself (and any request still in flight) is torn down by `withBrowserContext`'s `finally` once `execute` returns. */
async function runPageCheckOrAbort(
  signal: AbortSignal,
  run: () => Promise<PageCheckOutcome>,
): Promise<PageCheckOutcome | 'aborted'> {
  if (signal.aborted) return 'aborted';

  return new Promise((resolve, reject) => {
    const onAbort = (): void => resolve('aborted');
    signal.addEventListener('abort', onAbort, { once: true });
    run()
      .then((outcome) => {
        signal.removeEventListener('abort', onAbort);
        resolve(outcome);
      })
      .catch((error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      });
  });
}

/**
 * Phase 7's real QA engine: launches Chromium, conservatively crawls a
 * web application starting from its environment's base URL (same-origin
 * only, bounded by page/depth/duration limits), and runs a deterministic
 * functional check on each page reached — recording factual evidence
 * (HTTP status, console/network errors, a screenshot) without ever
 * asserting a diagnosis. Implements the same `TestExecutor` interface
 * `PlaceholderTestExecutor` does, so `worker.ts`'s orchestration is
 * unchanged; `index.ts` decides which executor a given run gets.
 */
export class PlaywrightTestExecutor implements TestExecutor {
  constructor(private readonly deps: PlaywrightTestExecutorDeps) {}

  async execute(context: TestExecutionContext): Promise<TestExecutionResult> {
    const target = await this.deps.resolveTarget(context);
    if (!target) {
      return {
        status: 'failed',
        errorMessage: 'The project or environment for this test run could not be found.',
        results: [],
      };
    }

    const validated = await validateTargetUrl(target.baseUrl, { allowedTestHosts: this.deps.allowedTestHosts });
    if (!validated.allowed) {
      return { status: 'failed', errorMessage: `Target URL is not allowed: ${validated.reason}`, results: [] };
    }

    const limits = readCrawlLimits(context.configuration);

    // Resolved fresh per run, never cached across runs or organizations —
    // see security/auth-context.ts. `unavailable` is not thrown; it's
    // carried through to crawlSite so one evidence page still gets
    // checked/screenshotted before the run is marked `blocked`, per
    // docs/authentication-qa.md (never a silently-passed login page,
    // never a faked authentication).
    const authResolution = await resolveAuthContext(
      { loadCredentialSecret: (credentialId) => this.deps.loadCredentialSecret(context.organizationId, context.projectId, credentialId) },
      target.authMethod,
      target.authCredentialId,
    );

    const browserOptions: BrowserManagerOptions = {
      headless: this.deps.headless ?? true,
      navigationTimeoutMs: limits.navigationTimeoutMs,
      ...(authResolution.kind === 'stored_state' ? { storageState: authResolution.storageState } : {}),
    };

    await this.deps.onProgress(context, 'Launching browser…');

    try {
      return await withBrowserContext(browserOptions, (browserContext) =>
        crawlSite(browserContext, validated.url, limits, context.signal, (message) => this.deps.onProgress(context, message), {
          preBlockedReason: authResolution.kind === 'unavailable' ? authResolution.reason : null,
        }),
      );
    } catch (error) {
      return {
        status: 'failed',
        errorMessage: `Could not start the browser: ${error instanceof Error ? error.message : String(error)}`,
        results: [],
      };
    }
  }
}

export interface CrawlOptions {
  /**
   * Set when authentication resolution already failed before any page was
   * reached (see `execute` — a missing credential, an unimplemented auth
   * method, a malformed stored state). The crawl still runs exactly one
   * real page check against `allowedOrigin` so the run gets genuine
   * evidence (a screenshot, HTTP status, final URL) instead of zero pages —
   * but the overall result is forced to `blocked` regardless of that one
   * check's own pass/fail outcome, and no further pages are queued. Never
   * `null` is not the same as "authentication succeeded"; it only means
   * `execute` didn't already know the run was blocked before crawling
   * started — see the depth-0 auth-boundary check below for the other way
   * a run becomes `blocked`.
   */
  preBlockedReason: string | null;
}

/**
 * The crawl itself, decoupled from `PlaywrightTestExecutor.execute`'s SSRF
 * gate (`validateTargetUrl`) and target resolution so it can be exercised
 * directly against a real local fixture server in tests — a real target
 * URL is never reachable without genuine, un-mockable network access, but
 * `allowedOrigin` here is assumed already validated by the caller (see
 * `execute`, the only production caller).
 */
export async function crawlSite(
  browserContext: BrowserContext,
  allowedOrigin: URL,
  limits: CrawlLimits,
  signal: AbortSignal,
  onProgress: (message: string) => Promise<void>,
  options: CrawlOptions = { preBlockedReason: null },
): Promise<TestExecutionResult> {
  installRouteGuard(browserContext, allowedOrigin);
  const page = await browserContext.newPage();

  const startedAt = Date.now();
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizeUrl(allowedOrigin), depth: 0 }];

  const results: TestExecutionResultItem[] = [];
  const artifacts: TestExecutionArtifact[] = [];
  let pagesFailed = 0;
  let cancelled = false;
  let lastProgressAt = 0;
  /**
   * Once set, no further links are queued (see the `!blockedReason` guard
   * below), so the loop naturally stops after the one page already in
   * flight — no separate early-exit check needed. Distinct from `failed`:
   * this means "Qavio couldn't get past a login boundary", not "the
   * application is broken".
   */
  let blockedReason: string | null = options.preBlockedReason;

  while (queue.length > 0) {
    if (signal.aborted) {
      cancelled = true;
      break;
    }
    if (results.length >= limits.maxPages) break;
    if (Date.now() - startedAt >= limits.maxDurationMs) break;

    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);

    const now = Date.now();
    if (now - lastProgressAt >= PROGRESS_THROTTLE_MS) {
      lastProgressAt = now;
      await onProgress(`Checking page ${results.length + 1} of up to ${limits.maxPages}: ${next.url}`);
    }

    const outcome = await runPageCheckOrAbort(signal, () =>
      runPageCheck(page, next.url, { navigationTimeoutMs: limits.navigationTimeoutMs, failOnConsoleError: limits.failOnConsoleError }),
    );

    if (outcome === 'aborted') {
      cancelled = true;
      break;
    }

    if (outcome.status === 'failed') pagesFailed += 1;

    const resultId = randomUUID();
    results.push({
      id: resultId,
      name: next.url,
      status: outcome.status === 'passed' ? 'passed' : 'failed',
      durationMs: outcome.durationMs,
      errorMessage: outcome.errorMessage,
    });

    for (const artifact of outcome.artifacts) {
      artifacts.push({
        resultId,
        kind: artifact.kind,
        filename: `${resultId}-${artifact.filename}`,
        contentType: artifact.contentType,
        data: artifact.data,
      });
    }

    // Only the entry page (depth 0) is checked against this heuristic — a
    // redirect discovered several hops into the crawl is far more likely
    // to be an ordinary in-app login-gated sub-feature than the whole
    // target being behind an authentication boundary Qavio isn't
    // configured for, and misclassifying that as `blocked` would hide a
    // real crawl finding. `blockedReason` can already be set here (the
    // `preBlockedReason` case) — this check is skipped then, since the
    // run's fate is already decided.
    if (!blockedReason && next.depth === 0 && outcome.finalUrl) {
      const finalUrl = new URL(outcome.finalUrl);
      const requestedPath = new URL(next.url).pathname;
      if (finalUrl.pathname !== requestedPath && looksLikeAuthBoundary(finalUrl)) {
        blockedReason = `The target redirected to an authentication page (${finalUrl.pathname}) and no working authentication is configured for this environment.`;
      }
    }

    if (!blockedReason && next.depth < limits.maxDepth && outcome.finalUrl) {
      const discovered = discoverLinks({
        hrefs: outcome.discoveredHrefs,
        pageUrl: new URL(outcome.finalUrl),
        allowedOrigin,
        alreadySeen: visited,
      });
      for (const link of discovered) {
        queue.push({ url: link, depth: next.depth + 1 });
      }
    }
  }

  const summary = {
    pagesChecked: results.length,
    pagesPassed: results.length - pagesFailed,
    pagesFailed,
    cancelled,
    blocked: blockedReason !== null,
  };

  if (cancelled) {
    return { status: 'failed', errorMessage: 'Test run was cancelled during execution.', results, artifacts, summary };
  }

  if (blockedReason) {
    // Every result already collected (at most one — see `preBlockedReason`
    // and the depth-0 check above) is relabelled `blocked` too, so the
    // dashboard's per-page results table never shows a `passed`/`failed`
    // page underneath a run whose overall status is `blocked`.
    const blockedResults = results.map((result) => ({ ...result, status: 'blocked' as const }));
    return { status: 'blocked', errorMessage: blockedReason, results: blockedResults, artifacts, summary };
  }

  if (results.length === 0) {
    return {
      status: 'failed',
      errorMessage: 'No pages could be checked — the target may be unreachable.',
      results,
      artifacts,
      summary,
    };
  }

  return {
    status: pagesFailed > 0 ? 'failed' : 'completed',
    errorMessage: pagesFailed > 0 ? `${pagesFailed} of ${results.length} page(s) failed.` : undefined,
    results,
    artifacts,
    summary,
  };
}
