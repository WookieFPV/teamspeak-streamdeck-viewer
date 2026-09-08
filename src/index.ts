import { config } from "~/config";
import { envVars } from "~/envVars";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { isShuttingDown, markShuttingDown } from "~/streamdeck/shutdown";
import { paintStatusScreen } from "~/streamdeck/status";
import { getTsBackend } from "~/teamspeak/BackendFactory";
import { TsDrawClients } from "~/teamspeak/tsDrawClients";
import { getPollingDelay } from "~/teamspeak/tsHelper";
import { wait, waitForNetwork } from "~/utils/helper";
import { logger } from "~/utils/logger";
import { waitForRefresh } from "~/utils/refreshTrigger";

const runTsViewer = async () => {
  logger.info("run runTsViewer");
  // the deck itself is the very first thing brought up, so startup progress
  // can be shown on it as early as possible - just one status tile plus the
  // clock, since there is no client data to show yet
  const streamDeck = await getStreamdeck();
  const bootSteps = 3;
  await paintStatusScreen(streamDeck, "deck", "black", `1/${bootSteps}`);

  await paintStatusScreen(streamDeck, "network", "black", `2/${bootSteps}`);
  await waitForNetwork();

  // short label to fit the key - mirrors the [TS]/[WS] log prefixes used by each backend
  const backendLabel = envVars.BACKEND_TYPE === "customApi" ? "api" : "ts3";
  await paintStatusScreen(streamDeck, backendLabel, "black", `3/${bootSteps}`);
  const TsBackend = getTsBackend(envVars);

  while (true) {
    try {
      logger.debug("TsBackend.getClients()");
      const clients = await TsBackend.getClients({});
      if (isShuttingDown()) break;
      await TsDrawClients(clients);
      // interruptible: backend events wake the loop immediately instead of
      // waiting out the full polling delay (up to 5s)
      await waitForRefresh(getPollingDelay(clients));
    } catch (err) {
      if (isShuttingDown()) break;
      logger.info("err in main loop");
      logger.warn(err);
      // a failed fetch means there is no trustworthy client list right now,
      // so replace whatever was on screen with an explicit error instead of
      // leaving stale client data showing
      await paintStatusScreen(streamDeck, "err", "red");
      // also interruptible: a reconnect event retries right away
      await waitForRefresh(config.idleTimeError);
    }
  }
};

runTsViewer();

// systemd stops the process with SIGTERM (Ctrl-C is SIGINT): without this
// the deck kept showing stale client data and in-flight work hung the exit.
// Clear the panel, close the device, then exit. The restart button keeps its
// own exit(1) path so systemd restarts the service.
const shutdown = async (signal: string) => {
  if (isShuttingDown()) return;
  markShuttingDown();
  logger.warn(`received ${signal}, clearing deck and exiting`);
  try {
    const streamDeck = await Promise.race([
      getStreamdeck(),
      wait(2000).then(() => {
        throw new Error("timed out waiting for streamdeck");
      }),
    ]);
    await streamDeck.clearPanel();
    await streamDeck.close();
  } catch (err) {
    logger.warn(`shutdown cleanup failed: ${err}`);
  }
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) =>
  logger.error(`unhandledRejection: ${reason}`),
);

/*
export const staticData = {
    clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
    prevCid: ""
}*/
