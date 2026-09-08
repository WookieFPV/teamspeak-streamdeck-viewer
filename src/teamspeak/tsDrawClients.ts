import { config } from "~/config";
import { envVars } from "~/envVars";
import { clientStateToColor } from "~/streamdeck/colors";
import {
  buttonCount,
  clearKeys,
  drawClock,
  paintClientKey,
} from "~/streamdeck/deck";
import { getStreamdeck } from "~/streamdeck/getStreamdeck";
import { parseNicknameMapping, planDeckLayout } from "~/streamdeck/layout";
import type { TeamSpeakClient } from "./teamspeakTypes";

// parsed once at startup from NICKNAME_MAPPING (see envVars)
const nicknameMapping = parseNicknameMapping(envVars.NICKNAME_MAPPING);

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

  for (const key of layout.paints) {
    await paintClientKey(streamDeck, key.index, {
      name: key.name,
      color: clientStateToColor(key.client, layout.mainUser),
      afkText: key.afkText,
    });
  }

  await clearKeys(streamDeck, layout.clearIndices);

  if (layout.clockIndices) {
    await drawClock(streamDeck, layout.clockIndices);
  }
};
