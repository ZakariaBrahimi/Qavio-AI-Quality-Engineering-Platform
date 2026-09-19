import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLookup = vi.hoisted(() => vi.fn());

vi.mock('node:dns', () => ({
  promises: { lookup: mockLookup },
}));

import { isSameOrigin, validateTargetUrl } from '../target-validation';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateTargetUrl — well-formed, allowed URLs', () => {
  it('allows a valid https URL that resolves to a public address', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const result = await validateTargetUrl('https://staging.example.com/app');
    expect(result.allowed).toBe(true);
  });

  it('allows a valid http URL that resolves to a public address', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const result = await validateTargetUrl('http://staging.example.com');
    expect(result.allowed).toBe(true);
  });
});

describe('validateTargetUrl — malformed input', () => {
  it('rejects a malformed URL', async () => {
    const result = await validateTargetUrl('not a url');
    expect(result.allowed).toBe(false);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('rejects an empty string', async () => {
    const result = await validateTargetUrl('');
    expect(result.allowed).toBe(false);
  });
});

describe('validateTargetUrl — protocol restrictions', () => {
  it.each(['ftp://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi'])(
    'rejects unsupported protocol: %s',
    async (rawUrl) => {
      const result = await validateTargetUrl(rawUrl);
      expect(result.allowed).toBe(false);
      expect(mockLookup).not.toHaveBeenCalled();
    },
  );
});

describe('validateTargetUrl — literal hostname blocks (no DNS lookup needed)', () => {
  it('rejects "localhost"', async () => {
    const result = await validateTargetUrl('http://localhost:3000');
    expect(result.allowed).toBe(false);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('rejects a *.localhost hostname', async () => {
    const result = await validateTargetUrl('http://foo.localhost');
    expect(result.allowed).toBe(false);
  });

  it('rejects the GCP metadata hostname', async () => {
    const result = await validateTargetUrl('http://metadata.google.internal/computeMetadata/v1/');
    expect(result.allowed).toBe(false);
  });
});

describe('validateTargetUrl — literal IPv4 targets', () => {
  it('rejects loopback (127.0.0.1)', async () => {
    const result = await validateTargetUrl('http://127.0.0.1:8080');
    expect(result.allowed).toBe(false);
  });

  it('rejects 10.x private range', async () => {
    const result = await validateTargetUrl('http://10.0.0.5');
    expect(result.allowed).toBe(false);
  });

  it('rejects 172.16.x private range', async () => {
    const result = await validateTargetUrl('http://172.16.5.1');
    expect(result.allowed).toBe(false);
  });

  it('rejects 192.168.x private range', async () => {
    const result = await validateTargetUrl('http://192.168.1.1');
    expect(result.allowed).toBe(false);
  });

  it('rejects the cloud metadata address 169.254.169.254 (link-local)', async () => {
    const result = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.allowed).toBe(false);
  });

  it('allows a public-looking literal IPv4 address', async () => {
    const result = await validateTargetUrl('http://93.184.216.34');
    expect(result.allowed).toBe(true);
  });
});

describe('validateTargetUrl — literal IPv6 targets', () => {
  it('rejects IPv6 loopback (::1)', async () => {
    const result = await validateTargetUrl('http://[::1]:3000');
    expect(result.allowed).toBe(false);
  });

  it('rejects IPv6 link-local (fe80::…)', async () => {
    const result = await validateTargetUrl('http://[fe80::1]');
    expect(result.allowed).toBe(false);
  });

  it('rejects an IPv4-mapped IPv6 metadata address (SSRF bypass via ::ffff:)', async () => {
    const result = await validateTargetUrl('http://[::ffff:169.254.169.254]');
    expect(result.allowed).toBe(false);
  });
});

describe('validateTargetUrl — DNS-resolved targets', () => {
  it('rejects a hostname that resolves to a private IP', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);
    const result = await validateTargetUrl('http://internal.example.com');
    expect(result.allowed).toBe(false);
  });

  it('rejects a hostname that resolves to the metadata address', async () => {
    mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    const result = await validateTargetUrl('http://rebind.example.com');
    expect(result.allowed).toBe(false);
  });

  it('rejects when only one of several resolved addresses is private (defense in depth)', async () => {
    mockLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    const result = await validateTargetUrl('http://multi-a-record.example.com');
    expect(result.allowed).toBe(false);
  });

  it('rejects a hostname that fails to resolve', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    const result = await validateTargetUrl('http://does-not-exist.invalid');
    expect(result.allowed).toBe(false);
  });

  it('rejects a hostname that resolves to zero addresses', async () => {
    mockLookup.mockResolvedValue([]);
    const result = await validateTargetUrl('http://no-records.example.com');
    expect(result.allowed).toBe(false);
  });
});

describe('isSameOrigin', () => {
  it('treats identical protocol/host/port as the same origin', () => {
    expect(isSameOrigin(new URL('https://staging.example.com/about'), new URL('https://staging.example.com'))).toBe(
      true,
    );
  });

  it('rejects a different hostname (external domain)', () => {
    expect(isSameOrigin(new URL('https://evil.example.com'), new URL('https://staging.example.com'))).toBe(false);
  });

  it('rejects a different protocol', () => {
    expect(isSameOrigin(new URL('http://staging.example.com'), new URL('https://staging.example.com'))).toBe(false);
  });

  it('rejects a different port', () => {
    expect(isSameOrigin(new URL('https://staging.example.com:8443'), new URL('https://staging.example.com'))).toBe(
      false,
    );
  });

  it('rejects a redirect to a disallowed origin, even when the path looks innocuous', () => {
    const allowed = new URL('https://staging.example.com');
    const redirectTarget = new URL('https://evil.example.com/staging.example.com/about');
    expect(isSameOrigin(redirectTarget, allowed)).toBe(false);
  });
});
