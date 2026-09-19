import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createThrottledRefresh } from '../throttled-refresh';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createThrottledRefresh', () => {
  it('runs the first call immediately', () => {
    const refresh = vi.fn();
    const throttled = createThrottledRefresh(refresh, 1000);

    throttled.call();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('coalesces a burst of calls within the window into one trailing call — reproduces the Test Run Details bug, where a fast run emits queued/starting/running/completed UPDATEs within a couple of seconds and each one used to fire its own router.refresh()', () => {
    const refresh = vi.fn();
    const throttled = createThrottledRefresh(refresh, 1000);

    // Mirrors a real run's rapid postgres_changes cascade: several
    // UPDATE events arriving within the same short window.
    throttled.call(); // leading — runs immediately
    throttled.call(); // coalesced
    throttled.call(); // coalesced
    throttled.call(); // coalesced

    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    // Exactly one trailing call for the whole burst — not one per event.
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not fire a trailing call when nothing was coalesced', () => {
    const refresh = vi.fn();
    const throttled = createThrottledRefresh(refresh, 1000);

    throttled.call();
    vi.advanceTimersByTime(1000);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes again immediately once a new window opens', () => {
    const refresh = vi.fn();
    const throttled = createThrottledRefresh(refresh, 1000);

    throttled.call();
    vi.advanceTimersByTime(1000);
    throttled.call();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('cancel() drops a pending trailing call', () => {
    const refresh = vi.fn();
    const throttled = createThrottledRefresh(refresh, 1000);

    throttled.call();
    throttled.call();
    throttled.cancel();
    vi.advanceTimersByTime(1000);

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
