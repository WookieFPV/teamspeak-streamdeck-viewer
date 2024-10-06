import { Colors } from "../types";
import { envVars } from "../envVars";
import {TeamSpeakClient} from "./teamspeakTypes";

const nameMapping: Record<string, string> = {
  "FK1024 | Felix": "Felix",
  "N1m4": "Nima"
}

export const getName = (client: TeamSpeakClient): string => nameMapping[client.clientNickname] ?? client.clientNickname

export const clientStateToColor = (client: TeamSpeakClient): Colors => {
  if (client.clientFlagTalking) {
    return "light_blue"
  } else if (client.clientInputMuted && !client.clientOutputMuted) {
    return "orange"
  } else if (client.clientOutputMuted) {
    return "red"
  } else {
    return "blue"
  }
}

export const isMainUser = (ts: TeamSpeakClient): boolean =>
  ts.clientUniqueIdentifier === envVars.TS3_USER_CID


