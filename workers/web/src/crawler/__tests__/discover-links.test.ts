import { describe, expect, it } from 'vitest';

import { discoverLinks, normalizeUrl } from '../discover-links';

const ALLOWED_ORIGIN = new URL('https://staging.example.com');
const PAGE_URL = new URL('https://staging.example.com/');

function discover(hrefs: string[], overrides: Partial<{ pageUrl: URL; alreadySeen: Set<string> }> = {}) {
  return discoverLinks({
    hrefs,
    pageUrl: overrides.pageUrl ?? PAGE_URL,
    allowedOrigin: ALLOWED_ORIGIN,
    alreadySeen: overrides.alreadySeen ?? new Set(),
  });
}

describe('discoverLinks — same-origin discovery', () => {
  it('discovers same-origin relative links', () => {
    expect(discover(['/about', '/contact'])).toEqual(
      expect.arrayContaining(['https://staging.example.com/about', 'https://staging.example.com/contact']),
    );
  });

  it('discovers same-origin absolute links', () => {
    expect(discover(['https://staging.example.com/pricing'])).toContain('https://staging.example.com/pricing');
  });

  it('resolves a relative link against the page it was found on, not the origin root', () => {
    const result = discover(['pricing'], { pageUrl: new URL('https://staging.example.com/products/') });
    expect(result).toContain('https://staging.example.com/products/pricing');
  });
});

describe('discoverLinks — external/unsupported rejection', () => {
  it('ignores an external domain', () => {
    expect(discover(['https://evil.example.com/phish'])).toEqual([]);
  });

  it('ignores a different subdomain (not the same origin)', () => {
    expect(discover(['https://other.staging.example.com/'])).toEqual([]);
  });

  it('ignores mailto: links', () => {
    expect(discover(['mailto:someone@example.com'])).toEqual([]);
  });

  it('ignores tel: links', () => {
    expect(discover(['tel:+15555550100'])).toEqual([]);
  });

  it('ignores javascript: links', () => {
    expect(discover(['javascript:void(0)'])).toEqual([]);
  });

  it('ignores unresolvable/malformed hrefs without crashing', () => {
    expect(discover(['http://[not-a-valid-host'])).toEqual([]);
  });

  it('ignores empty and fragment-only hrefs', () => {
    expect(discover(['', '   ', '#section-2'])).toEqual([]);
  });
});

describe('discoverLinks — destructive/download filtering', () => {
  it.each(['/logout', '/sign-out', '/account/delete', '/subscription/cancel', '/admin/purge'])(
    'skips a destructive-looking path: %s',
    (path) => {
      expect(discover([path])).toEqual([]);
    },
  );

  it.each(['/files/report.pdf', '/downloads/app.zip', '/installer.exe'])('skips a download link: %s', (path) => {
    expect(discover([path])).toEqual([]);
  });

  it('still discovers a normal page whose name merely contains a similar substring in an unrelated way', () => {
    // "deleterious-effects" contains "delete" only as a substring inside a longer word — the word-boundary regex must not false-positive on it.
    expect(discover(['/blog/deleterious-effects-of-bad-ux'])).toContain(
      'https://staging.example.com/blog/deleterious-effects-of-bad-ux',
    );
  });
});

describe('discoverLinks — normalization and deduplication', () => {
  it('normalizes a trailing slash so /about and /about/ dedupe', () => {
    const result = discover(['/about', '/about/']);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('https://staging.example.com/about');
  });

  it('strips the fragment for deduplication', () => {
    const result = discover(['/about#team', '/about#history']);
    expect(result).toHaveLength(1);
  });

  it('strips the query string (avoids query-parameter explosions)', () => {
    const result = discover(['/products?sort=asc', '/products?sort=desc', '/products']);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('https://staging.example.com/products');
  });

  it('does not re-discover a link already in alreadySeen', () => {
    const result = discover(['/about'], { alreadySeen: new Set(['https://staging.example.com/about']) });
    expect(result).toEqual([]);
  });

  it('does not discover the exact same link twice within one page', () => {
    const result = discover(['/about', '/about']);
    expect(result).toHaveLength(1);
  });
});

describe('normalizeUrl', () => {
  it('keeps the root path as "/"', () => {
    expect(normalizeUrl(new URL('https://staging.example.com/'))).toBe('https://staging.example.com/');
  });

  it('drops a trailing slash on a non-root path', () => {
    expect(normalizeUrl(new URL('https://staging.example.com/about/'))).toBe('https://staging.example.com/about');
  });
});
