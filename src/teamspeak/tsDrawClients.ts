import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { drawClock, streamDeckPaintTs } from "~/streamdeck/paintStreamdeck";
import type { TeamSpeakClient } from "./teamspeakTypes";
import { isMainUser } from "./tsHelper";

export const TsDrawClients = async (
	clientsRaw: TeamSpeakClient[],
): Promise<void> => {
	const streamDeck = await getStreamdeck();
	const mainUser = clientsRaw.find(isMainUser);
	const clients = clientsRaw.filter(
		(c) => !mainUser || c.cid === mainUser?.cid,
	);

	for (const client of clients) {
		const i = clients.indexOf(client);
		if (i >= streamDeck.NUM_KEYS) continue;

		const clientIdleTime = Date.now() - client.clientLastActiveTime;

		const idleTimeMins = Math.floor(clientIdleTime / 1000 / 60);

		//staticData.clientOnDeck[i] = client
		await streamDeckPaintTs(streamDeck, client, i, idleTimeMins, mainUser);
	}

	if (clients.length !== 0) {
		for (let i = clients.length; i < streamDeck.NUM_KEYS; i++) {
			await streamDeck.clearKey(i);
		}
	} else {
		await drawClock(streamDeck);
	}
};
