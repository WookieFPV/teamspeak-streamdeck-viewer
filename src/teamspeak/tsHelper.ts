import { config } from "~/config";
import { envVars } from "~/envVars";
import type { TeamSpeakClient } from "./teamspeakTypes";

const nameMapping: Record<string, string> = {
  "FK1024 | Felix": "Felix",
  N1m4: "Nima",
};

export const getName = (client: TeamSpeakClient): string =>
  nameMapping[client.clientNickname] ?? client.clientNickname;

export const isMainUser = (ts: TeamSpeakClient): boolean =>
  ts.clientUniqueIdentifier === envVars.TS3_USER_CID;

export const getPollingDelay = (clients: TeamSpeakClient[]): number => {
  if (clients.length === 0) return config.idleTimeNoUserMs;
  if (clients.find(isMainUser)) return config.idleTimeMainUserOnlineMs;
  return config.idleTimeWithRandomUsers;
};
