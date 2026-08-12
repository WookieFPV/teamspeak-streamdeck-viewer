import type { TeamSpeakChannel, TeamSpeakClient } from "../teamspeakTypes";

export type TsWsEventConnect = { type: "clientConnect"; e: ClientConnect };
export type TsWsEventDisconnect = {
  type: "clientDisconnect";
  e: ClientDisconnect;
};
export type TsWsEventMoved = { type: "clientMoved"; e: ClientMoved };
export type TsWsEventConnected = { type: "connected" };

/** the api server lost its query connection, data may be stale from now on */
export type TsWsEventTsDisconnected = {
  type: "tsDisconnected";
  reason: string;
};
/** the api server is back, `repaired` events were replayed to catch up */
export type TsWsEventTsReconnected = {
  type: "tsReconnected";
  repaired: number;
};
/** periodic liveness signal, see the watchdog in TsBackendCustomApi */
export type TsWsEventHeartbeat = {
  type: "heartbeat";
  sentAt: number;
  tsConnected: boolean;
  clientCount: number;
};

export type TsWsEvent =
  | TsWsEventConnect
  | TsWsEventDisconnect
  | TsWsEventMoved
  | TsWsEventConnected
  | TsWsEventTsDisconnected
  | TsWsEventTsReconnected
  | TsWsEventHeartbeat;

export const stringifyWsEvent = (wsEvent: TsWsEvent): string =>
  JSON.stringify(wsEvent);

export interface ClientConnect {
  client: TeamSpeakClient;
}

export interface ClientDisconnect {
  client?: TeamSpeakClient;
  event: {
    cfid: string;
    ctid: string;
    reasonid: string;
    reasonmsg: string;
    clid: string;
    invokerid?: string;
    invokername?: string;
    invokeruid?: string;
    bantime?: number;
  };
}

export interface ClientMoved {
  client: TeamSpeakClient;
  channel: TeamSpeakChannel;
  reasonid: string;
}
