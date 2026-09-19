import { isSameOrigin } from '../security/target-validation';

/** Path/keyword patterns conservative enough to skip crawling entirely — logout and destructive-looking actions. This is about the *crawler's own* link-following, not clicking buttons (see the executor for why Phase 7 never clicks anything at all). */
const DESTRUCTIVE_PATH_PATTERN = /\b(log[-_]?out|sign[-_]?out|delete|remove|destroy|purge|deactivate|unsubscribe|cancel)\b/i;

/** File extensions that trigger a browser download rather than rendering a page — nothing useful for the crawler to "visit". */
const DOWNLOAD_EXTENSION_PATTERN = /\.(zip|exe|dmg|pkg|msi|rar|7z|tar|gz|iso|apk|pdf|docx?|xlsx?|pptx?)$/i;

function resolveLink(href: string, baseUrl: URL): URL | null {
  try {
    return new URL(href, baseUrl);
  } catch {
    return null;
  }
}

/** Strips the fragment (never a distinct page) and the query string (the single biggest source of "duplicate" pages — see "avoid query-parameter explosions"), and normalizes a trailing slash away except for the root path, so `/about` and `/about/` dedupe to the same entry. */
function normalizeUrl(url: URL): string {
  const path = url.pathname.length > 1 && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  return `${url.protocol}//${url.host}${path}`;
}

function isCrawlableProtocol(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function looksDestructiveOrDownload(url: URL): boolean {
  return DESTRUCTIVE_PATH_PATTERN.test(url.pathname) || DOWNLOAD_EXTENSION_PATTERN.test(url.pathname);
}

export interface DiscoverLinksOptions {
  /** Raw `href` attribute values as found on the page — includes `mailto:`, `tel:`, `javascript:`, external domains, and anything else a real page has; all of it gets filtered here, none of it upstream. */
  hrefs: string[];
  /** The page these hrefs were found on — hrefs are resolved relative to this. */
  pageUrl: URL;
  /** The one origin the whole crawl is allowed to stay within (the environment's own base URL). */
  allowedOrigin: URL;
  /** Already-queued-or-visited normalized URLs, so a page discovered from multiple links only gets queued once. */
  alreadySeen: ReadonlySet<string>;
}

/**
 * Filters a page's raw links down to the ones worth crawling: resolvable,
 * http(s), same-origin as the environment's configured base URL, not a
 * download link, not a logout/destructive-looking path, and not already
 * seen. Returns normalized URL strings — the same normalization used for
 * the "already seen" dedup check, so a caller can feed the result
 * straight back in as part of a growing `alreadySeen` set.
 */
export function discoverLinks(options: DiscoverLinksOptions): string[] {
  const { hrefs, pageUrl, allowedOrigin, alreadySeen } = options;
  const discovered = new Set<string>();

  for (const href of hrefs) {
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const resolved = resolveLink(trimmed, pageUrl);
    if (!resolved) continue;
    if (!isCrawlableProtocol(resolved)) continue;
    if (!isSameOrigin(resolved, allowedOrigin)) continue;
    if (looksDestructiveOrDownload(resolved)) continue;

    const normalized = normalizeUrl(resolved);
    if (alreadySeen.has(normalized) || discovered.has(normalized)) continue;

    discovered.add(normalized);
  }

  return [...discovered];
}

export { normalizeUrl };
