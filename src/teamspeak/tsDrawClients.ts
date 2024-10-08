import {StreamDeck} from "@elgato-stream-deck/node";
import {isMainUser} from "./tsHelper";
import {drawClock, streamDeckPaintTs} from "../streamdeck";
import {staticData} from "../index";
import {TeamSpeakClient} from "./teamspeakTypes";
import {getTsClients} from "./tsQueryClient";

export const TsDrawClients = async (streamDeck: StreamDeck, forceRefresh = false): Promise<TeamSpeakClient[]> => {
    const clientsRaw = await getTsClients({forceRefresh})

    const mainUser = clientsRaw.find(isMainUser)
    const clients = clientsRaw.filter(c => !mainUser || c.cid === mainUser?.cid)

    for (const client of clients) {
        const i = clients.indexOf(client);
        if (i >= streamDeck.NUM_KEYS) continue;
        const idleTime = Math.floor(client.clientIdleTime / 1000 / 60)

        staticData.clientOnDeck[i] = client
        await streamDeckPaintTs(streamDeck, client, i, idleTime)
    }

    if (clients.length !== 0) {
        for (let i = clients.length; i < streamDeck.NUM_KEYS; i++) {
            await streamDeck.clearKey(i)
        }
    } else {
        await drawClock(streamDeck)
    }
    return clients
}
