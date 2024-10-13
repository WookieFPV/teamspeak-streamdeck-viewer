import {wait, waitForNetwork} from "~/utils/helper";
import {TsDrawClients} from "~/teamspeak/tsDrawClients";
import {getPollingDelay} from "~/teamspeak/tsHelper";
import {config} from "~/config";
import {getStreamdeck} from "~/streamdeck/getStreamdeck";
import {TsBackend} from "~/teamspeak/BackendFactory";
import {logger} from "~/utils/logger";

const runTsViewer = async () => {
    logger.info("run runTsViewer")
    await getStreamdeck()
    await waitForNetwork()

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
