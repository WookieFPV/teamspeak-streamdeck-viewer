import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";

const nameMapping: Record<string, string> = {
  "FK1024 | Felix": "Felix",
  N1m4: "Nima",
};

export const getName = (client: TeamSpeakClient): string =>
  nameMapping[client.clientNickname] ?? client.clientNickname;

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
  const clients = mainUser
    ? clientsRaw.filter((c) => c.cid === mainUser.cid)
    : [...clientsRaw];

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
      name: getName(client),
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
