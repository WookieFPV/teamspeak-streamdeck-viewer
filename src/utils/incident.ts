import {
  closeSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { logger } from "~/utils/logger";

const INCIDENT_DIR = process.env.INCIDENT_DIR ?? "incidents";
const KEEP_INCIDENTS = 20;
const LOG_TAIL_BYTES = 64 * 1024;

const readTail = (file: string, bytes: number): string => {
  try {
    const size = statSync(file).size;
    const start = Math.max(0, size - bytes);
    const fd = openSync(file, "r");
    try {
      const buf = Buffer.alloc(size - start);
      readSync(fd, buf, 0, buf.length, start);
      return buf.toString("utf8");
    } finally {
      closeSync(fd);
    }
  } catch (err) {
    return `(could not read ${file}: ${err})`;
  }
};

/**
 * winston rotates by renaming into numbered files (streamdeck.log,
 * streamdeck1.log, ...), so the name from LOG_FILE can be a stale one. The
 * active file is the most recently written sibling.
 */
export const findActiveLogFile = (logFile: string): string => {
  try {
    const dir = path.dirname(logFile);
    const stem = path.basename(logFile, ".log");
    const pattern = new RegExp(`^${stem}\\d*\\.log$`);
    const newest = readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];
    return newest ? path.join(dir, newest.f) : logFile;
  } catch {
    return logFile;
  }
};

/**
 * Snapshot what is needed to debug a watchdog restart into its own file,
 * which - unlike the rotating main log - survives until pruned here. Fully
 * synchronous on purpose: the caller exits the process right afterwards.
 */
export const saveIncident = (reason: string): void => {
  try {
    mkdirSync(INCIDENT_DIR, { recursive: true });
    const file = path.join(
      INCIDENT_DIR,
      `${new Date().toISOString().replace(/[:.]/g, "-")}.log`,
    );
    const mem = process.memoryUsage();
    const header = [
      `reason: ${reason}`,
      `time: ${new Date().toISOString()}`,
      `process uptime: ${Math.round(process.uptime())}s`,
      `rss: ${Math.round(mem.rss / 1048576)}MB heapUsed: ${Math.round(mem.heapUsed / 1048576)}MB`,
      `bun: ${process.versions.bun ?? "?"}`,
      "",
      `--- last ${LOG_TAIL_BYTES / 1024}KB of log ---`,
    ].join("\n");
    const logFile = process.env.LOG_FILE ?? "streamdeck.log";
    writeFileSync(
      file,
      `${header}\n${readTail(findActiveLogFile(logFile), LOG_TAIL_BYTES)}\n`,
    );

    const old = readdirSync(INCIDENT_DIR)
      .filter((f) => f.endsWith(".log"))
      .sort();
    for (const f of old.slice(0, Math.max(0, old.length - KEEP_INCIDENTS))) {
      unlinkSync(path.join(INCIDENT_DIR, f));
    }
    logger.error(`incident saved to ${file}`);
  } catch (err) {
    logger.error(`could not save incident: ${err}`);
  }
};

/** number of incident files younger than `days` (0 if the dir does not exist) */
export const countRecentIncidents = (
  days: number,
  now = Date.now(),
  dir = INCIDENT_DIR,
): number => {
  try {
    return readdirSync(dir).filter(
      (f) =>
        f.endsWith(".log") &&
        now - statSync(path.join(dir, f)).mtimeMs < days * 86_400_000,
    ).length;
  } catch {
    return 0;
  }
};
