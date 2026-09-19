import type { BrowserContext, Route } from 'playwright';

import { isSameOrigin, validateTargetUrl } from './target-validation';

/**
 * Installs one request interceptor for the whole crawl (context-scoped, not
 * per-page) so every navigation — including each hop of a redirect chain,
 * which Playwright surfaces as its own intercepted request — and every
 * sub-resource request (scripts, images, XHR/fetch) gets checked before
 * it's allowed to leave. `validateTargetUrl` alone (checked once, up
 * front, against the environment's base URL) isn't enough: a same-origin
 * page can redirect anywhere, and a page can probe internal addresses via
 * `<img>`/`fetch` regardless of where the page itself was served from.
 *
 * Navigation requests must stay on the run's allowed origin AND pass the
 * SSRF check. Sub-resource requests are allowed cross-origin (legitimate
 * CDNs, fonts, analytics) but still must pass the SSRF check — otherwise
 * a page could use an `<img src>` to probe a cloud metadata endpoint.
 */
export function installRouteGuard(context: BrowserContext, allowedOrigin: URL): void {
  const verdictCache = new Map<string, boolean>();

  async function isAllowedCrossOrigin(rawUrl: string): Promise<boolean> {
    const cacheKey = new URL(rawUrl).origin;
    const cached = verdictCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = await validateTargetUrl(rawUrl);
    verdictCache.set(cacheKey, result.allowed);
    return result.allowed;
  }

  context.route('**/*', async (route: Route) => {
    const request = route.request();
    const requestUrl = request.url();

    // Never leave the machine — nothing to validate against an SSRF target.
    if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:') || requestUrl.startsWith('about:')) {
      await route.continue();
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch {
      await route.abort('blockedbyclient');
      return;
    }

    // Same-origin as the environment's own base URL, which was already SSRF-validated once
    // before the crawl started (see PlaywrightTestExecutor) — nothing further to check here.
    if (isSameOrigin(parsed, allowedOrigin)) {
      await route.continue();
      return;
    }

    // A cross-origin *navigation* means leaving the run's target site entirely (a same-origin
    // page redirecting elsewhere, or a link somehow slipping past the crawler's own same-origin
    // filter) — never follow it, regardless of where it points.
    if (request.isNavigationRequest()) {
      await route.abort('blockedbyclient');
      return;
    }

    // A cross-origin *sub-resource* (a CDN, font, analytics script, or a page's own
    // <img>/fetch probe) is allowed, but only once it clears the same SSRF check the initial
    // target went through — otherwise a page could use it to reach an internal address.
    const allowed = await isAllowedCrossOrigin(requestUrl);
    if (!allowed) {
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });
}
