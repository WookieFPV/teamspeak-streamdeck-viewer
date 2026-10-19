import { describe, expect, test } from "bun:test";
import { beat, describeStall, isStalled, setStage } from "./watchdog";

describe("watchdog", () => {
  test("not stalled right after a beat, stalled once stallMs passed", () => {
    beat();
    const now = Date.now();
    expect(isStalled(now, 1000)).toBe(false);
    expect(isStalled(now + 1000, 1000)).toBe(true);
  });

  test("describes the stage it is stuck in", () => {
    beat();
    setStage("paint");
    expect(describeStall(Date.now() + 61_000)).toContain('stage "paint"');
  });
});
