import {wait, waitForNetwork} from "~/utils/helper";
import {TsDrawClients} from "~/teamspeak/tsDrawClients";
import {getPollingDelay} from "~/teamspeak/tsHelper";
import {config} from "~/config";
import {getStreamdeck} from "~/streamdeck/getStreamdeck";
import {TsBackend} from "~/teamspeak/BackendFactory";

const runTsViewer = async () => {
    console.log("run runTsViewer")
    await getStreamdeck()
    await waitForNetwork()

    while (true) {
        try {
            console.log("TsBackend.getClients()")
            const clients = await TsBackend.getClients({})
            await TsDrawClients(clients)
            await wait(getPollingDelay(clients))
        } catch (err) {
            console.warn(err)
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
