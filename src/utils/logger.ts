import { createLogger, format, transports } from "winston";

// format.splat() applies util.format to multi-arg calls like
// logger.info("join", nickname, json): without it winston's printf only
// saw the first arg and silently dropped the rest.
const formatWithTime = format.printf(
  ({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`,
);

// Console goes to stdout (journald under systemd, terminal in dev). The file
// transport is the actual history: the old `> ~/streamdeck.log` redirect
// truncated the log on every start, so crashes left no trace. Winston rotates
// by size instead - no logrotate needed. Override with LOG_FILE.
const logFile = process.env.LOG_FILE ?? "streamdeck.log";

export const logger = createLogger({
  format: format.combine(format.timestamp(), format.splat(), formatWithTime),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: logFile,
      maxsize: 1 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
