import { z } from "zod";

export const clientType = {
  normalUser: 0,
  queryUser: 1,
} as const;

/**
 * The client shape used across the app. Validated at both boundaries that
 * produce it: the customApi HTTP response (`tsCustomApi.ts`) and the
 * websocket events (`WsEvent.ts`). Unknown fields from the server are
 * stripped; the ts3 query backend builds this shape directly
 * (`ts3ClientMapper.ts`) so it never needs parsing.
 *
 * `clientLastActiveTime` is optional on the wire (websocket events don't
 * carry it) and is filled in wherever the list is completed
 * (`addLastActiveTime`, `ts3ClientMapper`); drawing code falls back to
 * "now" when it is missing.
 */
export const teamSpeakClientSchema = z.object({
  clid: z.string(),
  cid: z.string(),
  clientNickname: z.string(),
  clientType: z.number(),
  clientAway: z.boolean(),
  clientFlagTalking: z.boolean(),
  clientInputMuted: z.boolean(),
  clientOutputMuted: z.boolean(),
  clientUniqueIdentifier: z.string(),
  clientIdleTime: z.number(),
  clientLastActiveTime: z.number().optional(),
});

export type TeamSpeakClient = z.infer<typeof teamSpeakClientSchema>;

export const teamSpeakChannelSchema = z
  .object({
    cid: z.string(),
    channelName: z.string(),
  })
  .passthrough();

export type TeamSpeakChannel = z.infer<typeof teamSpeakChannelSchema>;
