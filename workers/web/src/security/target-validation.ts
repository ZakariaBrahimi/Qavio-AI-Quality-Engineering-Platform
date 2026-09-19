import { promises as dns } from 'node:dns';

/**
 * SSRF protection for the Playwright QA engine. Qavio's worker runs a
 * real browser against a URL that ultimately comes from a database row
 * (`environments.base_url`) a user configured — never trust it blindly:
 * validate it the same way a public-facing service validates any
 * user-influenced outbound request. See docs/test-run-engine.md's
 * "Target URL security" section for the full model.
 *
 * Two things are validated, at different times:
 * 1. `validateTargetUrl` — the environment's own base URL, once, before
 *    launching a browser at all (protocol, hostname shape, and where it
 *    actually resolves).
 * 2. `isRequestAllowed` — every single navigation/request the crawler
 *    makes once the browser is running, including every redirect hop
 *    (Playwright's route interception sees each hop as its own request)
 *    — checking the original URL alone is not enough, since a same-
 *    origin page can redirect anywhere.
 */

export interface UrlValidationOk {
  allowed: true;
  url: URL;
}

export interface UrlValidationBlocked {
  allowed: false;
  reason: string;
}

export type UrlValidationResult = UrlValidationOk | UrlValidationBlocked;

const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost'];
const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

/** IPv4 blocks: loopback, RFC1918 private ranges, link-local (this is what makes 169.254.169.254 — every major cloud's metadata endpoint — unreachable), the "this network" block, carrier-grade NAT, documentation/benchmarking ranges, multicast, and reserved space. */
const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return false;
  return BLOCKED_IPV4_CIDRS.some(([base, prefix]) => {
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) return false;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) === (baseValue & mask);
  });
}

/** `::ffff:a9fe:a9fe` -> `169.254.169.254` — the WHATWG URL parser (and some resolvers) normalize an IPv4-mapped address to two hex groups rather than keeping the dotted-decimal form, so the raw string never contains recognizable digits unless this is unpacked first. */
function hexGroupsToIPv4(high: string, low: string): string {
  const h = parseInt(high, 16);
  const l = parseInt(low, 16);
  return `${(h >> 8) & 0xff}.${h & 0xff}.${(l >> 8) & 0xff}.${l & 0xff}`;
}

/** Unwraps an IPv4-mapped or NAT64 IPv6 address to its embedded IPv4, in whichever of the two forms it appears (dotted-decimal, e.g. `::ffff:169.254.169.254`, or hex groups, e.g. `::ffff:a9fe:a9fe`) — a well-known SSRF bypass ("access the metadata endpoint via its IPv6-mapped form") otherwise sails right through a naive IPv6-only check. */
function extractMappedIPv4(normalized: string): string | null {
  const dottedMatch = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized) ?? /^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  const dotted = dottedMatch?.[1];
  if (dotted) return dotted;

  const hexMatch = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(normalized);
  if (hexMatch?.[1] && hexMatch[2]) return hexGroupsToIPv4(hexMatch[1], hexMatch[2]);

  return null;
}

/** IPv6 loopback (::1), link-local (fe80::/10 — covers IPv6 metadata endpoints too), unique-local (fc00::/7, IPv6's answer to RFC1918), and IPv4-mapped/NAT64 addresses unwrapped and re-checked as IPv4. */
function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  const mappedIpv4 = extractMappedIPv4(normalized);
  if (mappedIpv4) return isBlockedIPv4(mappedIpv4);

  return false;
}

function isBlockedIp(ip: string, family: number): boolean {
  return family === 4 ? isBlockedIPv4(ip) : isBlockedIPv6(ip);
}

export interface ValidateTargetUrlOptions {
  /**
   * Exact `hostname` or `hostname:port` entries allowed to bypass the
   * private/loopback IP-range and literal-hostname checks below —
   * protocol and malformed-URL checks still apply regardless. This
   * exists solely so Phase 7 can be exercised end to end against
   * `apps/qa-fixture` running on localhost (every reachable address in a
   * local/dev environment is, correctly, inside a blocked range — see
   * docs/test-run-engine.md's "Target URL security" section). Populated
   * only from `PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST`, which is unset in
   * every deployed environment; never derived from anything a user
   * controls (a run's `configuration`, an environment's `base_url`, …).
   */
  allowedTestHosts?: ReadonlySet<string>;
}

/**
 * Validates one URL: well-formed, http(s) only, hostname not a literal
 * blocked name, and — the part a hostname-string check alone can't catch
 * — every IP address that hostname actually resolves to is outside every
 * blocked range. Resolves via DNS, so this also naturally rejects a
 * hostname that fails to resolve at all.
 */
export async function validateTargetUrl(rawUrl: string, options: ValidateTargetUrlOptions = {}): Promise<UrlValidationResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'Malformed URL.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: `Unsupported protocol "${url.protocol}" — only http/https are allowed.` };
  }

  const hostname = url.hostname.toLowerCase();

  if (options.allowedTestHosts?.has(url.port ? `${hostname}:${url.port}` : hostname)) {
    return { allowed: true, url };
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return { allowed: false, reason: `"${hostname}" is not an allowed target.` };
  }

  // A literal IP in the URL — validate directly, no DNS lookup needed.
  const literalFamily = hostname.includes(':') ? 6 : /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 4 : null;
  if (literalFamily) {
    if (isBlockedIp(hostname.replace(/^\[|\]$/g, ''), literalFamily)) {
      return { allowed: false, reason: `"${hostname}" resolves to a blocked internal/private address.` };
    }
    return { allowed: true, url };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { allowed: false, reason: `"${hostname}" could not be resolved.` };
  }

  if (addresses.length === 0) {
    return { allowed: false, reason: `"${hostname}" did not resolve to any address.` };
  }

  const blocked = addresses.find(({ address, family }) => isBlockedIp(address, family));
  if (blocked) {
    return { allowed: false, reason: `"${hostname}" resolves to a blocked internal/private address (${blocked.address}).` };
  }

  return { allowed: true, url };
}

/** Same protocol + hostname + port as the already-validated base URL — the crawler's own boundary, independent of the SSRF check above (a same-origin redirect target could still land back inside a private range, e.g. via a rebound DNS record; callers should still run `validateTargetUrl` on any URL before treating it as reachable). */
export function isSameOrigin(candidate: URL, allowedOrigin: URL): boolean {
  return candidate.protocol === allowedOrigin.protocol && candidate.hostname === allowedOrigin.hostname && candidate.port === allowedOrigin.port;
}
