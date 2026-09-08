import { createLogger, format, transports } from "winston";

// format.splat() applies util.format to multi-arg calls like
// logger.info("join", nickname, json): without it winston's printf only
// saw the first arg and silently dropped the rest.
const formatWithTime = format.printf(
  ({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`,
);

export const logger = createLogger({
  format: format.combine(format.timestamp(), format.splat(), formatWithTime),
  transports: [new transports.Console()],
});
