/**
 * Wake-up channel between backend event handlers and the main loop in
 * `index.ts`.
 *
 * Polling alone leaves worst-case latency at the polling delay (up to 5s
 * when the main user is offline). Instead, event handlers
 * (TS3 notifications, websocket messages) call `requestRefresh()` and the
 * main loop sleeps with `waitForRefresh()`, which resolves immediately on
 * wake. The main loop stays the sole painter, so concurrent paints can't
 * interleave.
 *
 * Coalescing comes for free: wakes arriving while a fetch/paint is in
 * flight set a pending flag that the next `waitForRefresh()` consumes, so
 * a burst of events collapses into back-to-back cycles rather than
 * stacking up. Event rate is human-scale (join/leave/move only, not
 * talking state), so no extra throttle is needed.
 */
let wakeCurrentSleep: (() => void) | null = null;
let pendingRefresh = false;

/** signal the main loop to cut its sleep short and refresh now */
export const requestRefresh = (): void => {
  pendingRefresh = true;
  wakeCurrentSleep?.();
};

/**
 * Sleep `ms`, resolving early if `requestRefresh()` was called before or
 * during the sleep. The timer is left referenced so the process stays
 * alive while the main loop sleeps.
 */
export const waitForRefresh = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    if (pendingRefresh) {
      pendingRefresh = false;
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      wakeCurrentSleep = null;
      resolve();
    }, ms);
    wakeCurrentSleep = () => {
      clearTimeout(timer);
      wakeCurrentSleep = null;
      pendingRefresh = false;
      resolve();
    };
  });
