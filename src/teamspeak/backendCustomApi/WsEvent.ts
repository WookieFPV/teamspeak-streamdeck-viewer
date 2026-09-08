import { z } from "zod";
import {
  teamSpeakChannelSchema,
  teamSpeakClientSchema,
} from "../teamspeakTypes";

const clientConnectEventSchema = z.object({
  type: z.literal("clientConnect"),
  e: z.object({ client: teamSpeakClientSchema }),
});

const clientDisconnectEventSchema = z.object({
  type: z.literal("clientDisconnect"),
  e: z.object({
    client: teamSpeakClientSchema.optional(),
    event: z
      .object({
        cfid: z.string(),
        ctid: z.string(),
        reasonid: z.string(),
        reasonmsg: z.string(),
        clid: z.string(),
        invokerid: z.string().optional(),
        invokername: z.string().optional(),
        invokeruid: z.string().optional(),
        bantime: z.number().optional(),
      })
      .passthrough(),
  }),
});

const clientMovedEventSchema = z.object({
  type: z.literal("clientMoved"),
  e: z.object({
    client: teamSpeakClientSchema,
    channel: teamSpeakChannelSchema,
    reasonid: z.string(),
  }),
});

const connectedEventSchema = z.object({ type: z.literal("connected") });

/** the api server lost its query connection, data may be stale from now on */
const tsDisconnectedEventSchema = z.object({
  type: z.literal("tsDisconnected"),
  reason: z.string(),
});

/** the api server is back, `repaired` events were replayed to catch up */
const tsReconnectedEventSchema = z.object({
  type: z.literal("tsReconnected"),
  repaired: z.number(),
});

/** periodic liveness signal, see the watchdog in TsBackendCustomApi */
const heartbeatEventSchema = z.object({
  type: z.literal("heartbeat"),
  sentAt: z.number(),
  tsConnected: z.boolean(),
  clientCount: z.number(),
});

export const tsWsEventSchema = z.discriminatedUnion("type", [
  clientConnectEventSchema,
  clientDisconnectEventSchema,
  clientMovedEventSchema,
  connectedEventSchema,
  tsDisconnectedEventSchema,
  tsReconnectedEventSchema,
  heartbeatEventSchema,
]);

export type TsWsEvent = z.infer<typeof tsWsEventSchema>;

export const stringifyWsEvent = (wsEvent: TsWsEvent): string =>
  JSON.stringify(wsEvent);

/** parses *and validates* one raw websocket message; throws on mismatch */
export const parseWsEvent = (data: string): TsWsEvent =>
  tsWsEventSchema.parse(JSON.parse(data));
