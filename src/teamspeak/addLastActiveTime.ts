import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";

export const addLastActiveTime = (
  clients: TeamSpeakClient[],
  now: number,
): TeamSpeakClient[] =>
  clients.map((c) => ({ ...c, clientLastActiveTime: c.clientIdleTime + now }));
