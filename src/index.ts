import { config } from "~/config";
import { envVars } from "~/envVars";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { paintStatusScreen } from "~/streamdeck/status";
import { getTsBackend } from "~/teamspeak/BackendFactory";
import { TsDrawClients } from "~/teamspeak/tsDrawClients";
import { getPollingDelay } from "~/teamspeak/tsHelper";
import { wait, waitForNetwork } from "~/utils/helper";
import { logger } from "~/utils/logger";

const runTsViewer = async () => {
  logger.info("run runTsViewer");
  // the deck itself is the very first thing brought up, so startup progress
  // can be shown on it as early as possible - just one status tile plus the
  // clock, since there is no client data to show yet
  const streamDeck = await getStreamdeck();
  await paintStatusScreen(streamDeck, "start", "black");

  await paintStatusScreen(streamDeck, "net", "black");
  await waitForNetwork();

  await paintStatusScreen(streamDeck, "ts3", "black");
  const TsBackend = getTsBackend(envVars);

  while (true) {
    try {
      logger.debug("TsBackend.getClients()");
      const clients = await TsBackend.getClients({});
      await TsDrawClients(clients);
      await wait(getPollingDelay(clients));
    } catch (err) {
      logger.info("err in main loop");
      logger.warn(err);
      // a failed fetch means there is no trustworthy client list right now,
      // so replace whatever was on screen with an explicit error instead of
      // leaving stale client data showing
      await paintStatusScreen(streamDeck, "err", "red");
      await wait(config.idleTimeError);
    }
  }
};

runTsViewer();

/*
export const staticData = {
    clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
    prevCid: ""
}*/
