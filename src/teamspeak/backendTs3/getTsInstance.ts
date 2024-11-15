import { QueryProtocol, TeamSpeak } from "ts3-nodejs-library";
import type { TsApiTs3 } from "~/envVars";
import { logger } from "~/utils/logger";
import { queryClient, queryKey } from "../queryClient";
import { TsDrawClients } from "../tsDrawClients";
import { filterAndMapTs3Clients } from "./ts3ClientMapper";

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
    queryClient.removeQueries({ queryKey: queryKey.clients });
    ts.clientList()
      .then((rawClients) => {
        TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn);
      })
      .catch(logger.warn);
  });
  ts.on("clientdisconnect", (e) => {
    if (!e.client) return logger.info("ts3 clientdisconnect: without Client");

    logger.info(`[TS] clientdisconnect: ${e.client.nickname}`);
    ts.clientList()
      .then((rawClients) => {
        TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn);
      })
      .catch(logger.warn);
  });
  ts.on("clientmoved", (e) => {
    logger.info(`[TS] clientmoved: ${e.client.nickname}`);
    queryClient.removeQueries({ queryKey: queryKey.clients });
    ts.clientList()
      .then((rawClients) => {
        TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn);
      })
      .catch(logger.warn);
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
