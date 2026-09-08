import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";

/** Display names come only from `NICKNAME_MAPPING` (see envVars) — nothing
 * is hardcoded, so no personal data lives in the repo. Absent entries fall
 * through to the raw TeamSpeak nickname. */

/** parse NICKNAME_MAPPING ("exact nickname=new name;...") into overrides */
export const parseNicknameMapping = (
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

export const getName = (
  client: TeamSpeakClient,
  mapping: Record<string, string> = {},
): string => mapping[client.clientNickname] ?? client.clientNickname;

export interface DeckLayoutOptions {
  /** number of button keys on the deck */
  numKeys: number;
  /** unique id of the watched user; when absent every client is shown */
  mainUserUid?: string;
  clockKeyCount: number;
  maxClientsWithClock: number;
  /** minutes of inactivity after which the afk badge appears */
  minIdleTimeMins: number;
  now: number;
  /** nickname overrides (from NICKNAME_MAPPING) */
  nameMapping?: Record<string, string>;
}

export interface PlannedKey {
  index: number;
  name: string;
  afkText: string;
  client: TeamSpeakClient;
}

export interface DeckLayout {
  mainUser: TeamSpeakClient | undefined;
  paints: PlannedKey[];
  clearIndices: number[];
  clockIndices: readonly [number, number, number] | undefined;
}

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
};

/**
 * Pure layout: which clients go on which keys, which keys to clear, and
 * where the clock goes. Only the main user's channel is shown while they
 * are online; the clock takes the last row of keys while enough keys are
 * free, otherwise every key is a client key. See `layout.test.ts`.
 */
export const planDeckLayout = (
  clientsRaw: TeamSpeakClient[],
  opts: DeckLayoutOptions,
): DeckLayout => {
  const mainUser = opts.mainUserUid
    ? clientsRaw.find((c) => c.clientUniqueIdentifier === opts.mainUserUid)
    : undefined;
  // Sort by clid (server-assigned, join order): backend list order is not
  // guaranteed stable across polls, and without this keys reshuffle
  // whenever the backend returns a different order.
  const clients = (
    mainUser
      ? clientsRaw.filter((c) => c.cid === mainUser.cid)
      : [...clientsRaw]
  ).sort((a, b) => Number(a.clid) - Number(b.clid));
  // only source of short names is the NICKNAME_MAPPING env var
  const mapping = opts.nameMapping ?? {};

  // the clock lives on the last row of keys, but only while enough keys are free
  const showClock =
    clients.length <= opts.maxClientsWithClock &&
    opts.numKeys - opts.clockKeyCount >= clients.length;
  const clockStart = opts.numKeys - opts.clockKeyCount;
  const clientKeys = showClock ? clockStart : opts.numKeys;

  const paints = clients.slice(0, clientKeys).map((client, index) => {
    const idleMins = Math.floor(
      (opts.now - (client.clientLastActiveTime ?? opts.now)) / 1000 / 60,
    );
    return {
      index,
      name: getName(client, mapping),
      afkText: idleMins >= opts.minIdleTimeMins ? `${idleMins}m` : "",
      client,
    };
  });

  return {
    mainUser,
    paints,
    clearIndices: range(paints.length, clientKeys),
    clockIndices: showClock
      ? [clockStart, clockStart + 1, clockStart + 2]
      : undefined,
  };
};
