import { describe, expect, test } from "bun:test";
import { Store } from "./store";

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Store", () => {
  test("fetches on first call and serves cache within staleMs", async () => {
    const store = new Store<string>();
    let calls = 0;
    const fn = async () => `v${++calls}`;
    expect(await store.fetch(fn, { staleMs: 1000 })).toBe("v1");
    expect(await store.fetch(fn, { staleMs: 1000 })).toBe("v1");
    expect(calls).toBe(1);
  });

  test("refetches after staleMs expires", async () => {
    const store = new Store<string>();
    let calls = 0;
    const fn = async () => `v${++calls}`;
    await store.fetch(fn, { staleMs: 10 });
    await tick(25);
    expect(await store.fetch(fn, { staleMs: 10 })).toBe("v2");
    expect(calls).toBe(2);
  });

  test("forceRefresh bypasses fresh cache", async () => {
    const store = new Store<string>();
    let calls = 0;
    const fn = async () => `v${++calls}`;
    await store.fetch(fn, { staleMs: 1000 });
    expect(await store.fetch(fn, { forceRefresh: true })).toBe("v2");
    expect(calls).toBe(2);
  });

  test("invalidate drops the cache", async () => {
    const store = new Store<string>();
    let calls = 0;
    const fn = async () => `v${++calls}`;
    await store.fetch(fn, { staleMs: Number.POSITIVE_INFINITY });
    store.invalidate();
    expect(store.get()).toBeUndefined();
    expect(await store.fetch(fn, { staleMs: Number.POSITIVE_INFINITY })).toBe(
      "v2",
    );
  });

  test("single-flights concurrent fetches", async () => {
    const store = new Store<string>();
    let calls = 0;
    const fn = async () => {
      calls++;
      await tick(10);
      return "v";
    };
    const [a, b] = await Promise.all([store.fetch(fn), store.fetch(fn)]);
    expect(a).toBe("v");
    expect(b).toBe("v");
    expect(calls).toBe(1);
  });

  test("failures are not cached", async () => {
    const store = new Store<number>();
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return 42;
    };
    await expect(store.fetch(fn)).rejects.toThrow("boom");
    expect(store.get()).toBeUndefined();
    expect(await store.fetch(fn)).toBe(42);
  });

  test("set overwrites and counts as fresh", async () => {
    const store = new Store<number>();
    store.set(7);
    let calls = 0;
    expect(
      await store.fetch(async () => ++calls, {
        staleMs: Number.POSITIVE_INFINITY,
      }),
    ).toBe(7);
    expect(calls).toBe(0);
    store.set((old) => (old ?? 0) + 1);
    expect(store.get()).toBe(8);
  });
});
