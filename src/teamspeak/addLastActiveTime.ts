import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";

/**
 * `clientIdleTime` is in milliseconds (TeamSpeak server query native unit,
 * same as `ts3-nodejs-library`'s `client.idleTime`), so the last-active
 * timestamp is `now - idleTime`. Must stay consistent with
 * `ts3ClientMapper.ts`, which computes the same value inline.
 */
export const addLastActiveTime = (
  clients: TeamSpeakClient[],
  now: number,
): TeamSpeakClient[] =>
  clients.map((c) => ({ ...c, clientLastActiveTime: now - c.clientIdleTime }));
