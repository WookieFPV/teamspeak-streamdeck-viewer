import { logger } from "~/utils/logger";

/**
 * Self-healing for a wedged main loop. The loop awaits network and HID work
 * that can, rarely, never settle - the process stays alive (the restart button
 * still works) but the deck freezes and the clock stops. The loop reports the
 * step it is in via `setStage()` and each finished cycle via `beat()`; if no
 * cycle completes for `stallMs` the watchdog logs where it was stuck and exits
 * so systemd restarts the service.
 */
let stage = "boot";
let stageSince = Date.now();
let lastBeat = Date.now();

/** name the step the main loop is about to await (shown when it stalls) */
export const setStage = (name: string): void => {
  stage = name;
  stageSince = Date.now();
};

/** a full fetch+paint cycle finished */
export const beat = (): void => {
  lastBeat = Date.now();
};

export const describeStall = (now: number): string =>
  `no completed cycle for ${Math.round((now - lastBeat) / 1000)}s, ` +
  `stuck in stage "${stage}" for ${Math.round((now - stageSince) / 1000)}s`;

export const isStalled = (now: number, stallMs: number): boolean =>
  now - lastBeat >= stallMs;

export const startWatchdog = (
  stallMs: number,
  checkMs: number,
  onStall: (reason: string) => void,
): (() => void) => {
  const timer = setInterval(() => {
    const now = Date.now();
    if (isStalled(now, stallMs)) onStall(describeStall(now));
  }, checkMs);
  // never keeps the process alive on its own
  timer.unref();
  logger.info(
    `watchdog armed: restart after ${stallMs / 1000}s without a cycle`,
  );
  return () => clearInterval(timer);
};
