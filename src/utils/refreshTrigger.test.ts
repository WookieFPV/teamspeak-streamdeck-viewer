import { describe, expect, test } from "bun:test";
import { requestRefresh, waitForRefresh } from "./refreshTrigger";

describe("waitForRefresh", () => {
  test("resolves early when woken mid-sleep", async () => {
    const start = Date.now();
    const done = waitForRefresh(5000);
    setTimeout(requestRefresh, 20);
    await done;
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test("a wake before the sleep returns immediately", async () => {
    requestRefresh();
    const start = Date.now();
    await waitForRefresh(5000);
    expect(Date.now() - start).toBeLessThan(100);
  });

  test("an unwoken sleep lasts the full delay", async () => {
    const start = Date.now();
    await waitForRefresh(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});
