import { config } from "~/config";
import { envVars } from "~/envVars";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { paintStartupStatus, paintStatusKey } from "~/streamdeck/status";
import { getTsBackend } from "~/teamspeak/BackendFactory";
import { TsDrawClients } from "~/teamspeak/tsDrawClients";
import { getPollingDelay } from "~/teamspeak/tsHelper";
import { wait, waitForNetwork } from "~/utils/helper";
import { logger } from "~/utils/logger";

const runTsViewer = async () => {
  logger.info("run runTsViewer");
  // the deck itself is the very first thing brought up, so startup progress
  // can be shown on it as early as possible
  const streamDeck = await getStreamdeck();
  await paintStartupStatus(streamDeck, "starting");

  await paintStartupStatus(streamDeck, "network");
  await waitForNetwork();

  await paintStartupStatus(streamDeck, "connecting");
  const TsBackend = getTsBackend(envVars);
  await paintStartupStatus(streamDeck, "ready");

  while (true) {
    try {
      logger.debug("TsBackend.getClients()");
      const clients = await TsBackend.getClients({});
      await TsDrawClients(clients);
      await wait(getPollingDelay(clients));
    } catch (err) {
      logger.info("err in main loop");
      logger.warn(err);
      await paintStatusKey(streamDeck);
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
