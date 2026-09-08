import { config } from "~/config";
import { getCornerButtonIndex } from "~/streamdeck/controlLayout";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { drawClock, streamDeckPaintTs } from "~/streamdeck/paintStreamdeck";
import { markClientsDrawn, paintStatusKey } from "~/streamdeck/status";
import type { TeamSpeakClient } from "./teamspeakTypes";
import { isMainUser } from "./tsHelper";

export const TsDrawClients = async (
  clientsRaw: TeamSpeakClient[],
): Promise<void> => {
  const streamDeck = await getStreamdeck();

  // the top-left key is permanently reserved for the connection status dot,
  // never for client/clock content
  const statusKeyIndex = getCornerButtonIndex(streamDeck, "top-left");
  const availableKeys = streamDeck.CONTROLS.filter((c) => c.type === "button")
    .map((c) => c.index)
    .filter((index) => index !== statusKeyIndex)
    .sort((a, b) => a - b);
  const numKeys = availableKeys.length;

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
    const key = availableKeys[i];
    if (i >= clientKeys || key === undefined) continue;

    const clientIdleTime = Date.now() - client.clientLastActiveTime;

    const idleTimeMins = Math.floor(clientIdleTime / 1000 / 60);

    //staticData.clientOnDeck[i] = client
    await streamDeckPaintTs(streamDeck, client, key, idleTimeMins, mainUser);
  }

  for (let i = clients.length; i < clientKeys; i++) {
    const key = availableKeys[i];
    if (key === undefined) continue;
    await streamDeck.clearKey(key);
  }

  const [clockKey1, clockKey2, clockKey3] = [
    availableKeys[clockStart],
    availableKeys[clockStart + 1],
    availableKeys[clockStart + 2],
  ];
  if (
    showClock &&
    clockKey1 !== undefined &&
    clockKey2 !== undefined &&
    clockKey3 !== undefined
  ) {
    await drawClock(streamDeck, [clockKey1, clockKey2, clockKey3]);
  }

  markClientsDrawn();
  await paintStatusKey(streamDeck);
};
