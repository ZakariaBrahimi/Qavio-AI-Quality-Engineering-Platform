export interface ThrottledRefresh {
  /** Requests a refresh — runs immediately unless one already ran within `delayMs`, in which case it's coalesced into a single trailing call. */
  call(): void;
  /** Cancels any pending trailing call — call on unmount so a stale refresh doesn't fire after the caller stops caring. */
  cancel(): void;
}

/**
 * Leading+trailing throttle for a high-frequency event source that drives
 * `router.refresh()` — built for `TestRunStatusPanel`'s Realtime
 * subscription, where a fast-completing Test Run can produce several
 * `test_runs` UPDATE events within a couple of seconds (queued ->
 * starting -> running -> completed). Calling `router.refresh()` once per
 * event fires that many overlapping RSC re-fetches of the whole route
 * tree, which can race each other in the Next.js App Router's client
 * cache. This bounds refresh calls to at most one per `delayMs` window:
 * the first event in a burst refreshes immediately (so a single, isolated
 * update still feels instant), and if more events arrive before the
 * window elapses, exactly one trailing refresh fires afterward — so the
 * run's final state is never dropped, just coalesced.
 */
export function createThrottledRefresh(refresh: () => void, delayMs: number): ThrottledRefresh {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let trailingPending = false;

  function scheduleWindow(): void {
    timer = setTimeout(() => {
      timer = null;
      if (trailingPending) {
        trailingPending = false;
        refresh();
        scheduleWindow();
      }
    }, delayMs);
  }

  return {
    call() {
      if (timer) {
        trailingPending = true;
        return;
      }
      refresh();
      scheduleWindow();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      trailingPending = false;
    },
  };
}
