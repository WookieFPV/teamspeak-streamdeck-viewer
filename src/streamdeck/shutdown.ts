/**
 * Set the instant the restart button is pressed, before any `await`. The
 * main loop is still running concurrently at that point (getClients() /
 * TsDrawClients() calls span multiple awaits), so without this flag it can
 * interleave and repaint over the "restart" status tile before the process
 * actually exits, making it flash and disappear instead of staying up.
 */
let shuttingDown = false;

export const isShuttingDown = (): boolean => shuttingDown;

export const markShuttingDown = (): void => {
  shuttingDown = true;
};
