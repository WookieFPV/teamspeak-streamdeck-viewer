import { config } from "~/config";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { drawClock, streamDeckPaintTs } from "~/streamdeck/paintStreamdeck";
import type { TeamSpeakClient } from "./teamspeakTypes";
import { isMainUser } from "./tsHelper";

export const TsDrawClients = async (
  clientsRaw: TeamSpeakClient[],
): Promise<void> => {
  const streamDeck = await getStreamdeck();
  const numKeys = streamDeck.CONTROLS.filter((c) => c.type === "button").length;
  const mainUser = clientsRaw.find(isMainUser);
  const clients = clientsRaw.filter(
    (c) => !mainUser || c.cid === mainUser?.cid,
  );

  // the clock lives on the last row of keys, but only while enough keys are free
  const showClock =
    clients.length <= config.maxClientsWithClock &&
    numKeys - config.clockKeyCount >= clients.length;
  const clockStart = numKeys - config.clockKeyCount;
  const clientKeys = showClock ? clockStart : numKeys;

  for (const client of clients) {
    const i = clients.indexOf(client);
    if (i >= clientKeys) continue;

    const clientIdleTime = Date.now() - client.clientLastActiveTime;

    const idleTimeMins = Math.floor(clientIdleTime / 1000 / 60);

    //staticData.clientOnDeck[i] = client
    await streamDeckPaintTs(streamDeck, client, i, idleTimeMins, mainUser);
  }

  for (let i = clients.length; i < clientKeys; i++) {
    await streamDeck.clearKey(i);
  }

  if (showClock) {
    await drawClock(streamDeck, clockStart);
  }
};
