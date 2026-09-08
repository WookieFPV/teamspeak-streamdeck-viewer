import { QueryProtocol, TeamSpeak } from "ts3-nodejs-library";
import type { EnvVars } from "~/envVars";
import { logger } from "~/utils/logger";

export type Ts3Vars = Extract<EnvVars, { BACKEND_TYPE: "ts3" }>;

export interface TsConnectionHooks {
  /** the query connection died; the cached instance must be dropped */
  onConnectionLost: () => void;
  /** clients changed server-side; the cached list must be refreshed */
  onClientsChanged: () => void;
}

export const connectTs = async (
  vars: Ts3Vars,
  hooks: TsConnectionHooks,
): Promise<TeamSpeak> => {
  logger.info(`[TS] connect (${vars.TS3_HOST})`);
  const ts = await TeamSpeak.connect({
    host: vars.TS3_HOST,
    queryport: vars.TS3_QUERYPORT,
    serverport: vars.TS3_SERVERPORT,
    protocol: QueryProtocol.RAW,
    username: vars.TS3_USERNAME,
    nickname: vars.TS3_NICKNAME,
    password: vars.TS3_PASSWORD,
  }).catch((e) => {
    logger.info("[TS] tsConnect error", e);
    throw e;
  });

  ts.on("error", (e) => {
    logger.info(`[TS] error: ${e}`);
  });
  ts.on("close", (error): void => {
    logger.info(`[TS] on close ${error}`);
    logger.warn(error);
    hooks.onConnectionLost();
  });
  ts.on("clientconnect", (e) => {
    logger.info(`[TS] clientconnect: ${e.client.nickname}`);
    hooks.onClientsChanged();
  });
  ts.on("clientdisconnect", (e) => {
    if (!e.client) return logger.info("ts3 clientdisconnect: without Client");

    logger.info(`[TS] clientdisconnect: ${e.client.nickname}`);
    hooks.onClientsChanged();
  });
  ts.on("clientmoved", (e) => {
    logger.info(`[TS] clientmoved: ${e.client.nickname}`);
    hooks.onClientsChanged();
  });

  logger.info("ts Connected");
  return ts;
};
