import isOnline from "is-online";
import pWaitFor from "p-wait-for";
import { logger } from "~/utils/logger";

export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const waitForNetwork = async () => {
  // only useful if started on a raspberry pi
  // It can happen that the script started before network was available
  logger.info("waiting on network...");
  await pWaitFor(isOnline, { timeout: 20 * 1000 });
  logger.info("waiting on network done");
};
