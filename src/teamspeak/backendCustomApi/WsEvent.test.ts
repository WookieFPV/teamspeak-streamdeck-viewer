import { describe, expect, test } from "bun:test";
import { parseWsEvent, stringifyWsEvent } from "./WsEvent";

const client = {
  clid: "1",
  cid: "5",
  clientNickname: "Alice",
  clientType: 0,
  clientAway: false,
  clientFlagTalking: true,
  clientInputMuted: false,
  clientOutputMuted: false,
  clientUniqueIdentifier: "uid-1",
  clientIdleTime: 1000,
};

describe("parseWsEvent", () => {
  test("parses every known variant", () => {
    expect(parseWsEvent(JSON.stringify({ type: "connected" }))).toEqual({
      type: "connected",
    });
    expect(
      parseWsEvent(JSON.stringify({ type: "clientConnect", e: { client } })),
    ).toMatchObject({ type: "clientConnect" });
    expect(
      parseWsEvent(
        JSON.stringify({
          type: "clientDisconnect",
          e: {
            event: {
              cfid: "1",
              ctid: "2",
              reasonid: "8",
              reasonmsg: "leave",
              clid: "1",
            },
          },
        }),
      ),
    ).toMatchObject({ type: "clientDisconnect" });
    expect(
      parseWsEvent(
        JSON.stringify({
          type: "clientMoved",
          e: {
            client,
            channel: { cid: "6", channelName: "lobby" },
            reasonid: "4",
          },
        }),
      ),
    ).toMatchObject({ type: "clientMoved" });
    expect(
      parseWsEvent(
        JSON.stringify({ type: "tsDisconnected", reason: "query down" }),
      ),
    ).toEqual({ type: "tsDisconnected", reason: "query down" });
    expect(
      parseWsEvent(JSON.stringify({ type: "tsReconnected", repaired: 3 })),
    ).toEqual({ type: "tsReconnected", repaired: 3 });
    expect(
      parseWsEvent(
        JSON.stringify({
          type: "heartbeat",
          sentAt: 123,
          tsConnected: true,
          clientCount: 2,
        }),
      ),
    ).toMatchObject({ type: "heartbeat", clientCount: 2 });
  });

  test("strips unknown client fields instead of failing", () => {
    const event = parseWsEvent(
      JSON.stringify({
        type: "clientConnect",
        e: { client: { ...client, connectionClientIp: "1.2.3.4" } },
      }),
    );
    expect(event.type).toBe("clientConnect");
    if (event.type === "clientConnect") {
      expect(event.e.client).not.toHaveProperty("connectionClientIp");
    }
  });

  test("rejects unknown event types", () => {
    expect(() => parseWsEvent(JSON.stringify({ type: "blast" }))).toThrow();
  });

  test("rejects malformed payloads", () => {
    expect(() => parseWsEvent("not json")).toThrow();
    expect(() => parseWsEvent(JSON.stringify({ type: "heartbeat" }))).toThrow();
    expect(() =>
      parseWsEvent(
        JSON.stringify({ type: "clientConnect", e: { client: {} } }),
      ),
    ).toThrow();
  });

  test("stringifyWsEvent round-trips", () => {
    const raw = stringifyWsEvent({ type: "connected" });
    expect(parseWsEvent(raw)).toEqual({ type: "connected" });
  });
});
