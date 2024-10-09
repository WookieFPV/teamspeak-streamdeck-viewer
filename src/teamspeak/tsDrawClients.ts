import {isMainUser} from "./tsHelper";
import {drawClock, streamDeckPaintTs} from "~/streamdeck/painStreamdeck";
import {TeamSpeakClient} from "./teamspeakTypes";
import {getStreamdeck} from "~/streamdeck/getStreamdeck";

export const TsDrawClients = async (clientsRaw: TeamSpeakClient[]): Promise<void> => {
    const streamDeck = await getStreamdeck()
    const mainUser = clientsRaw.find(isMainUser)
    const clients = clientsRaw.filter(c => !mainUser || c.cid === mainUser?.cid)

    for (const client of clients) {
        const i = clients.indexOf(client);
        if (i >= streamDeck.NUM_KEYS) continue;
        const idleTime = Math.floor(client.clientIdleTime / 1000 / 60)

        //staticData.clientOnDeck[i] = client
        await streamDeckPaintTs(streamDeck, client, i, idleTime)
    }

    if (clients.length !== 0) {
        for (let i = clients.length; i < streamDeck.NUM_KEYS; i++) {
            await streamDeck.clearKey(i)
        }
    } else {
        await drawClock(streamDeck)
    }
}
