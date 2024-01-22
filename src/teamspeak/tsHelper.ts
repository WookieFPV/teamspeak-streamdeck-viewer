import { TeamSpeakClient } from "ts3-nodejs-library";
import { Colors } from "../types";
import { envVars } from "../envVars";

const nameMapping: Record<string, string> = {
  "FK1024 | Felix": "Felix",
  "N1m4": "Nima"
}

export const getName = (client: TeamSpeakClient): string => nameMapping[client.nickname] ?? client.nickname

export const clientStateToColor = (client: TeamSpeakClient): Colors => {
  if (client.flagTalking) {
    return "light_blue"
  } else if (client.inputMuted && !client.outputMuted) {
    return "orange"
  } else if (client.outputMuted) {
    return "red"
  } else {
    return "blue"
  }
}

export const isMainUser = (ts: TeamSpeakClient): boolean =>
  ts.uniqueIdentifier === envVars.TS3_USER_CID


