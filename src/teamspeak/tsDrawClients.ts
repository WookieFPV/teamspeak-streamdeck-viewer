import { config } from "~/config";
import { envVars } from "~/envVars";
import { clientStateToColor } from "~/streamdeck/colors";
import {
  buttonCount,
  drawClock,
  isKeyUpToDate,
  markKeyPainted,
  paintClientKey,
} from "~/streamdeck/deck";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import {
  type PlannedKey,
  parseNicknameMapping,
  planDeckLayout,
} from "~/streamdeck/layout";
import { logger } from "~/utils/logger";
import type { TeamSpeakClient } from "./teamspeakTypes";

// parsed once at startup from NICKNAME_MAPPING (see envVars)
const nicknameMapping = parseNicknameMapping(envVars.NICKNAME_MAPPING);

/** Everything visible on one client key. Equal hash == equal image. */
const clientKeyHash = (
  key: PlannedKey,
  color: string,
  clientUid: string,
): string => [clientUid, key.name, key.afkText, color].join("|");

/** Marker for "key is known empty" so clears are skipped on later ticks. */
const EMPTY = "empty:cleared";

export const TsDrawClients = async (
  clientsRaw: TeamSpeakClient[],
): Promise<void> => {
  const streamDeck = await getStreamdeck();
  const layout = planDeckLayout(clientsRaw, {
    numKeys: buttonCount(streamDeck),
    mainUserUid: envVars.TS3_MAIN_USER_UID,
    clockKeyCount: config.clockKeyCount,
    maxClientsWithClock: config.maxClientsWithClock,
    minIdleTimeMins: config.minIdleTimeMins,
    now: Date.now(),
    nameMapping: nicknameMapping,
  });

  const paints: Promise<void>[] = [];

  for (const key of layout.paints) {
    const color = clientStateToColor(key.client, layout.mainUser);
    const hash = clientKeyHash(key, color, key.client.clientUniqueIdentifier);
    // unchanged keys keep their image: at 1s polling this skips ~all keys on
    // most ticks (idle minutes tick, talking flags flip - nothing else moves)
    if (isKeyUpToDate(key.index, hash)) continue;
    const index = key.index;
    paints.push(
      paintClientKey(streamDeck, index, {
        name: key.name,
        color,
        afkText: key.afkText,
      }).then((ok) => {
        if (ok) markKeyPainted(index, hash);
      }),
    );
  }

  for (const index of layout.clearIndices) {
    if (isKeyUpToDate(index, EMPTY)) continue;
    paints.push(
      streamDeck
        .clearKey(index)
        .then(() => markKeyPainted(index, EMPTY))
        .catch((error: unknown) => {
          logger.warn(error);
        }),
    );
  }

  // fills run concurrently - HID writes dominate, not sharp
  await Promise.all(paints);

  if (layout.clockIndices) {
    await drawClock(streamDeck, layout.clockIndices);
  }
};
