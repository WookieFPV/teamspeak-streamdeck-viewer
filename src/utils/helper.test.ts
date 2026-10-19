import { describe, expect, test } from "bun:test";
import { TimeoutError, withTimeout } from "./helper";

describe("withTimeout", () => {
  test("resolves with the value when fast enough", async () => {
    expect(await withTimeout("x", 100, Promise.resolve(1))).toBe(1);
  });

  test("rejects with TimeoutError when the promise never settles", async () => {
    await expect(
      withTimeout("hang", 20, new Promise<void>(() => {})),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  test("passes through the original rejection", async () => {
    await expect(
      withTimeout("x", 100, Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
  });
});
