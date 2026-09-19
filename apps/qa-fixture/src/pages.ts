/**
 * Every page here is deliberately simple HTML with no build step and no
 * framework — Phase 7's Playwright engine needs a real, reachable web app
 * to crawl and check, not a demo of what the app itself could look like.
 * Each page exists to exercise one specific thing the engine is supposed
 * to detect (see docs/test-run-engine.md's "Deterministic functional
 * checks" section): a healthy page, a broken one, a console error, and a
 * network failure.
 */

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;
}

export const HOME_PAGE = layout(
  'QA Fixture',
  `<p>A minimal app for exercising Qavio's Playwright QA engine.</p>
<nav>
  <ul>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
    <li><a href="/broken">Broken page</a></li>
    <li><a href="/console-error">Console error page</a></li>
    <li><a href="/network-error">Network error page</a></li>
  </ul>
</nav>`,
);

export const ABOUT_PAGE = layout(
  'About',
  `<p>This fixture app exists only to be crawled and checked. It has no other pages linked from here.</p>
<p><a href="/">Back home</a></p>`,
);

export const CONTACT_PAGE = layout(
  'Contact',
  `<p>A plain, non-destructive form — submitting it only reloads this same page.</p>
<form method="get" action="/contact">
  <label>Message <input type="text" name="message" /></label>
  <button type="submit">Send</button>
</form>
<p><a href="/">Back home</a></p>`,
);

export const BROKEN_PAGE = layout('Broken', '<p>This page always responds with a server error.</p>');

export const CONSOLE_ERROR_PAGE = layout(
  'Console Error',
  `<p>This page logs an error and a warning to the console on load.</p>
<script>
  console.error('Fixture: deliberate console error');
  console.warn('Fixture: deliberate console warning');
</script>`,
);

export const NETWORK_ERROR_PAGE = layout(
  'Network Error',
  `<p>This page triggers a failing sub-resource request and a failing fetch on load.</p>
<img src="/this-image-does-not-exist.png" alt="" />
<script>
  fetch('http://127.0.0.1:1/').catch(() => {
    // Expected to fail — that's the point of this page.
  });
</script>`,
);

export const NOT_FOUND_PAGE = layout('Not Found', '<p>Nothing here.</p>');
