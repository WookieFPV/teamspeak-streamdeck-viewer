import { logger } from "~/utils/logger";

export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/** lightweight connectivity probe: one HEAD request, true on any answer */
const isOnline = async (): Promise<boolean> => {
  try {
    await fetch("https://1.1.1.1", {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    return false;
  }
};

export const waitForNetwork = async () => {
  // only useful if started on a raspberry pi
  // It can happen that the script started before network was available
  logger.info("waiting on network...");
  const deadline = Date.now() + 20 * 1000;
  while (!(await isOnline())) {
    if (Date.now() >= deadline) {
      logger.warn("network still unreachable after 20s, continuing anyway");
      return;
    }
    await wait(1000);
  }
  logger.info("waiting on network done");
};

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Reject if `promise` has not settled within `ms`. The underlying work is not
 * cancelled (it can't be); this only stops the caller from waiting forever on
 * a promise that never settles, which would wedge the main loop.
 */
export const withTimeout = <T>(
  label: string,
  ms: number,
  promise: Promise<T>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
