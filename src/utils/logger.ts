import {createLogger, format, transports} from 'winston';

const formatWithTime = format.printf(({level, message}) => `[${new Date().toLocaleTimeString()}] ${level}: ${message}`);

export const logger = createLogger({
    format: formatWithTime,
    transports: [new transports.Console({format: format.timestamp()})],
});
