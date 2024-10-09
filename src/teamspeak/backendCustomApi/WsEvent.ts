import {TeamSpeakChannel, TeamSpeakClient} from "../teamspeakTypes";

export type TsWsEventConnect = { type: "clientConnect", e: ClientConnect }
export type TsWsEventDisconnect = { type: "clientDisconnect", e: ClientDisconnect }
export type TsWsEventMoved = { type: "clientMoved", e: ClientMoved }
export type TsWsEventConnected = { type: "connected" }

export type TsWsEvent = TsWsEventConnect | TsWsEventDisconnect | TsWsEventMoved | TsWsEventConnected

export const stringifyWsEvent = (wsEvent: TsWsEvent): string => JSON.stringify(wsEvent)

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
    client: TeamSpeakClient
    channel: TeamSpeakChannel
    reasonid: string
}
