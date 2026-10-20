import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("saveIncident writes reason and log tail, prunes old files", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "incident-"));
  process.env.INCIDENT_DIR = dir;
  process.env.LOG_FILE = path.join(dir, "main.log");
  await Bun.write(process.env.LOG_FILE, "line one\nline two\n");
  const { saveIncident } = await import("./incident");
  saveIncident('stuck in stage "paint"');
  const files = readdirSync(dir).filter((f) => f !== "main.log");
  expect(files.length).toBe(1);
  const content = readFileSync(path.join(dir, files[0] as string), "utf8");
  expect(content).toContain('stuck in stage "paint"');
  expect(content).toContain("line two");
});

test("countRecentIncidents only counts files younger than the window", async () => {
  const { utimesSync, writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(path.join(tmpdir(), "incident-count-"));
  writeFileSync(path.join(dir, "new.log"), "x");
  writeFileSync(path.join(dir, "old.log"), "x");
  const tenDaysAgo = (Date.now() - 10 * 86_400_000) / 1000;
  utimesSync(path.join(dir, "old.log"), tenDaysAgo, tenDaysAgo);
  const { countRecentIncidents } = await import("./incident");
  expect(countRecentIncidents(7, Date.now(), dir)).toBe(1);
  expect(countRecentIncidents(7, Date.now(), "/nonexistent-dir")).toBe(0);
});

test("findActiveLogFile picks the most recently written rotated sibling", async () => {
  const { utimesSync, writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(path.join(tmpdir(), "incident-log-"));
  for (const [name, ageS] of [
    ["app.log", 300],
    ["app1.log", 10],
    ["app19.log", 600],
    ["other.log", 0],
  ] as const) {
    writeFileSync(path.join(dir, name), "x");
    const t = Date.now() / 1000 - ageS;
    utimesSync(path.join(dir, name), t, t);
  }
  const { findActiveLogFile } = await import("./incident");
  expect(findActiveLogFile(path.join(dir, "app.log"))).toBe(
    path.join(dir, "app1.log"),
  );
});
