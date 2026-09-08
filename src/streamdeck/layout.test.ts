import { describe, expect, test } from "bun:test";
import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";
import { getName, parseNicknameMapping, planDeckLayout } from "./layout";

const client = (over: Partial<TeamSpeakClient> = {}): TeamSpeakClient => ({
  clid: "1",
  cid: "10",
  clientNickname: "Alice",
  clientType: 0,
  clientAway: false,
  clientFlagTalking: false,
  clientInputMuted: false,
  clientOutputMuted: false,
  clientUniqueIdentifier: "uid-alice",
  clientIdleTime: 0,
  clientLastActiveTime: 1_000_000,
  ...over,
});

const opts = {
  numKeys: 6,
  clockKeyCount: 3,
  maxClientsWithClock: 3,
  minIdleTimeMins: 5,
  now: 1_000_000 + 60_000,
};

describe("planDeckLayout", () => {
  test("shows only the main user's channel while they are online", () => {
    const main = client({ clientUniqueIdentifier: "uid-main", cid: "10" });
    const sameChannel = client({ clid: "2", cid: "10" });
    const otherChannel = client({ clid: "3", cid: "99" });
    const layout = planDeckLayout([main, sameChannel, otherChannel], {
      ...opts,
      mainUserUid: "uid-main",
    });
    expect(layout.mainUser?.clientUniqueIdentifier).toBe("uid-main");
    expect(layout.paints.map((p) => p.client.clid)).toEqual(["1", "2"]);
  });

  test("shows every client when the main user is offline", () => {
    const layout = planDeckLayout(
      [client({ clid: "1" }), client({ clid: "2", cid: "99" })],
      { ...opts, mainUserUid: "uid-main" },
    );
    expect(layout.mainUser).toBeUndefined();
    expect(layout.paints.map((p) => p.client.clid)).toEqual(["1", "2"]);
  });

  test("places the clock on the last keys while enough keys are free", () => {
    const layout = planDeckLayout([client()], opts);
    expect(layout.clockIndices).toEqual([3, 4, 5]);
    expect(layout.paints.map((p) => p.index)).toEqual([0]);
    expect(layout.clearIndices).toEqual([1, 2]);
  });

  test("hides the clock and pages clients when the deck is full", () => {
    const clients = Array.from({ length: 10 }, (_, i) =>
      client({ clid: `${i}`, clientNickname: `u${i}` }),
    );
    const layout = planDeckLayout(clients, opts);
    expect(layout.clockIndices).toBeUndefined();
    expect(layout.paints).toHaveLength(6);
    expect(layout.paints.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(layout.clearIndices).toEqual([]);
  });

  test("shows the afk badge only after the idle threshold", () => {
    const fresh = planDeckLayout([client()], opts);
    expect(fresh.paints[0]?.afkText).toBe("");
    const idle = planDeckLayout(
      [client({ clientLastActiveTime: opts.now - 7 * 60_000 })],
      opts,
    );
    expect(idle.paints[0]?.afkText).toBe("7m");
  });

  test("treats a missing last-active timestamp as just now", () => {
    const { clientLastActiveTime: _dropped, ...rest } = client();
    const layout = planDeckLayout([rest], opts);
    expect(layout.paints[0]?.afkText).toBe("");
  });

  test("sorts by clid so keys don't reshuffle when backend order changes", () => {
    const layout = planDeckLayout(
      [client({ clid: "9" }), client({ clid: "2" }), client({ clid: "5" })],
      opts,
    );
    expect(layout.paints.map((p) => p.client.clid)).toEqual(["2", "5", "9"]);
  });

  test("applies the NICKNAME_MAPPING overrides", () => {
    const layout = planDeckLayout([client({ clientNickname: "Alice" })], {
      ...opts,
      nameMapping: { Alice: "Al" },
    });
    expect(layout.paints[0]?.name).toBe("Al");
  });

  test("falls through to the raw nickname without a mapping", () => {
    const layout = planDeckLayout(
      [client({ clientNickname: "Some Very Long Nickname" })],
      opts,
    );
    expect(layout.paints[0]?.name).toBe("Some Very Long Nickname");
  });
});

describe("getName", () => {
  test("maps known nicknames and passes the rest through", () => {
    expect(
      getName(client({ clientNickname: "Some Very Long Nickname" }), {
        "Some Very Long Nickname": "Short",
      }),
    ).toBe("Short");
    expect(getName(client({ clientNickname: "stranger" }))).toBe("stranger");
  });

  test("explicit mapping is the only source of short names", () => {
    expect(
      getName(client({ clientNickname: "Some Very Long Nickname" }), {
        "Some Very Long Nickname": "S",
      }),
    ).toBe("S");
  });
});

describe("parseNicknameMapping", () => {
  test("parses ;-separated pairs on the first =", () => {
    expect(parseNicknameMapping("Long Nickname=Short;Bob=B;broken")).toEqual({
      "Long Nickname": "Short",
      Bob: "B",
    });
    expect(parseNicknameMapping(undefined)).toEqual({});
    expect(parseNicknameMapping("")).toEqual({});
  });
});
