import { config } from "~/config";
import { envVars } from "~/envVars";
import type { TeamSpeakClient } from "./teamspeakTypes";

export const isMainUser = (ts: TeamSpeakClient): boolean =>
  ts.clientUniqueIdentifier === envVars.TS3_MAIN_USER_UID;

export const getPollingDelay = (clients: TeamSpeakClient[]): number => {
  if (clients.length === 0) return config.idleTimeNoUserMs;
  if (clients.find(isMainUser)) return config.idleTimeMainUserOnlineMs;
  return config.idleTimeWithRandomUsers;
};
