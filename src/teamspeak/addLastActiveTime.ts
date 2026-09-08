import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";

/** the api reports how long a client has been idle; convert to a timestamp */
export const addLastActiveTime = (
  clients: TeamSpeakClient[],
  now: number,
): TeamSpeakClient[] =>
  clients.map((c) => ({ ...c, clientLastActiveTime: now - c.clientIdleTime }));
