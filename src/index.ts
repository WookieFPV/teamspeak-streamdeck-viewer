import {wait, waitForNetwork} from "~/utils/helper";
import {TsDrawClients} from "~/teamspeak/tsDrawClients";
import {getPollingDelay} from "~/teamspeak/tsHelper";
import {config} from "~/config";
import {getStreamdeck} from "~/streamdeck/getStreamdeck";
import {TsBackendFactory} from "~/teamspeak/BackendFactory";
import {logger} from "~/utils/logger";
import {envVars} from "~/envVars";

const runTsViewer = async () => {
    logger.info("run runTsViewer")
    await getStreamdeck()
    await waitForNetwork()

    const TsBackend = TsBackendFactory.getBackend(envVars)

    while (true) {
        try {
            logger.info("TsBackend.getClients()")
            const clients = await TsBackend.getClients({})
            await TsDrawClients(clients)
            await wait(getPollingDelay(clients))
        } catch (err) {
            logger.warn(err)
            await wait(config.idleTimeError)
        }
    }
}

runTsViewer()

/*
export const staticData = {
    clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
    prevCid: ""
}*/
