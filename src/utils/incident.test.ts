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
