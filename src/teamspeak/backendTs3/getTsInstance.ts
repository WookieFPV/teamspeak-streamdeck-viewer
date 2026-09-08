import { QueryProtocol, TeamSpeak } from "ts3-nodejs-library";
import type { TsApiTs3 } from "~/envVars";
import { logger } from "~/utils/logger";
import { requestRefresh } from "~/utils/refreshTrigger";
import { queryClient, queryKey } from "../queryClient";

const tsConnect = async (vars: TsApiTs3) => {
  logger.info(`[TS] connect (${vars.TS3_HOST})`);
  const ts = await TeamSpeak.connect({
    host: vars.TS3_HOST,
    queryport: 10011,
    serverport: 9987,
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
  ts.on("close", async (error): Promise<void> => {
    logger.info(`[TS] on close ${error}`);
    logger.warn(error);
    queryClient.removeQueries({ queryKey: queryKey.tsInstance });
  });
  ts.on("clientconnect", (e) => {
    logger.info(`[TS] clientconnect: ${e.client.nickname}`);
    // Only invalidate + wake: the main loop in `index.ts` is the sole
    // painter and repaints immediately on wake. Painting directly from here
    // used to race the main loop (two concurrent `TsDrawClients` runs with
    // no ordering guarantee, keys flashing mixed old/new state).
    queryClient.invalidateQueries({ queryKey: queryKey.clients });
    requestRefresh();
  });
  ts.on("clientdisconnect", (e) => {
    if (!e.client) return logger.info("ts3 clientdisconnect: without Client");

    logger.info(`[TS] clientdisconnect: ${e.client.nickname}`);
    queryClient.invalidateQueries({ queryKey: queryKey.clients });
    requestRefresh();
  });
  ts.on("clientmoved", (e) => {
    logger.info(`[TS] clientmoved: ${e.client.nickname}`);
    queryClient.invalidateQueries({ queryKey: queryKey.clients });
    requestRefresh();
  });

  logger.info("ts Connected");
  return ts;
};

export const getTsInstance = async (vars: TsApiTs3) =>
  queryClient.fetchQuery({
    queryKey: queryKey.tsInstance,
    queryFn: () => tsConnect(vars),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
