import { config } from "~/config";
import { envVars } from "~/envVars";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { getTsBackend } from "~/teamspeak/BackendFactory";
import { TsDrawClients } from "~/teamspeak/tsDrawClients";
import { getPollingDelay } from "~/teamspeak/tsHelper";
import { wait, waitForNetwork } from "~/utils/helper";
import { logger } from "~/utils/logger";

const runTsViewer = async () => {
  logger.info("run runTsViewer");
  await getStreamdeck();
  await waitForNetwork();

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
