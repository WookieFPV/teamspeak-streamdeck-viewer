import { config } from "~/config";
import { envVars } from "~/envVars";
import type { TeamSpeakClient } from "./teamspeakTypes";

const parseNicknameMapping = (
  raw: string | undefined,
): Record<string, string> => {
  const mapping: Record<string, string> = {};
  if (!raw) return mapping;
  for (const entry of raw.split(";")) {
    const eq = entry.indexOf("=");
    if (eq <= 0) continue;
    const from = entry.slice(0, eq).trim();
    const to = entry.slice(eq + 1).trim();
    if (from && to) mapping[from] = to;
  }
  return mapping;
};

// parsed once at startup from NICKNAME_MAPPING (see envVars)
const nameMapping: Record<string, string> = parseNicknameMapping(
  envVars.NICKNAME_MAPPING,
);

export const getName = (client: TeamSpeakClient): string =>
  nameMapping[client.clientNickname] ?? client.clientNickname;

export const isMainUser = (ts: TeamSpeakClient): boolean =>
  ts.clientUniqueIdentifier === envVars.TS3_USER_CID;

export const getPollingDelay = (clients: TeamSpeakClient[]): number => {
  if (clients.length === 0) return config.idleTimeNoUserMs;
  if (clients.find(isMainUser)) return config.idleTimeMainUserOnlineMs;
  return config.idleTimeWithRandomUsers;
};
