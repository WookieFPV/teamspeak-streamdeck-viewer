import { StreamDeck } from "@elgato-stream-deck/node";
import { TeamSpeak } from "ts3-nodejs-library";
import { isMainUser } from "./tsHelper";
import { drawClock, streamDeckPaintTs } from "../streamdeck";
import { wait } from "../helper";
import { staticData } from "../index";

export const TsDrawClients = async (streamDeck: StreamDeck, ts: TeamSpeak) => {
  const clientsRaw = (await ts.clientList()).filter(c => c.type === 0)

  const mainUser = clientsRaw.find(isMainUser)
  const clients = clientsRaw.filter(c => !mainUser || c.cid === mainUser?.cid)

  for (const client of clients) {
    const i = clients.indexOf(client);
    if (i >= streamDeck.NUM_KEYS) continue;
    const idleTime = Math.floor(client.idleTime / 1000 / 60)

    staticData.clientOnDeck[i] = client
    await streamDeckPaintTs(streamDeck, client, i, idleTime)
  }

  if(clients.length !== 0){
    for (let i = clients.length; i < streamDeck.NUM_KEYS; i++) {
      await streamDeck.clearKey(i)
    }
  }

  if (clients.length === 0) {
    console.log("no one online: sleep some time...")
    await drawClock(streamDeck)
    await wait(10 * 1000)
  } else if (!clients.find(isMainUser)) {
    console.log("mainUser offline: sleep some time...")
    await wait(5 * 1000)
  }
}
