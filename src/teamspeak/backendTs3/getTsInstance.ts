import {TsApiTs3} from "~/envVars";
import {QueryProtocol, TeamSpeak} from "ts3-nodejs-library";
import {queryClient, queryKey} from "../queryClient";
import {filterAndMapTs3Clients} from "./ts3ClientMapper";
import {TsDrawClients} from "../tsDrawClients";
import {logger} from "~/utils/logger";

const tsConnect = async (vars: TsApiTs3) => {
    logger.info(`ts connect (${vars.TS3_HOST})`)
    const ts = await TeamSpeak.connect({
        host: vars.TS3_HOST,
        queryport: 10011,
        serverport: 9987,
        protocol: QueryProtocol.RAW,
        username: vars.TS3_USERNAME,
        nickname: vars.TS3_NICKNAME,
        password: vars.TS3_PASSWORD,
    }).catch(e => {
        logger.info("tsConnect error", e)
        throw e
    })

    ts.on("error", e => {
        logger.info(`ts3 error: ${e}`)
    })
    ts.on("close", async (error): Promise<void> => {
        logger.info(`disconnected ${error}`);
        logger.warn(error)
        queryClient.removeQueries({queryKey: queryKey.tsInstance})
    });
    ts.on("clientconnect", e => {
        logger.info(`ts3 clientconnect: ${e.client.nickname}`)
        queryClient.removeQueries({queryKey: queryKey.clients})
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn)
        }).catch(logger.warn)
    })
    ts.on("clientdisconnect", e => {
        if(!e.client) return logger.info(`ts3 clientdisconnect: without Client`)

        logger.info(`ts3 clientdisconnect: ${e.client.nickname}`)
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn)
        }).catch(logger.warn)
    })
    ts.on("clientmoved", e => {
        logger.info(`ts3 clientmoved: ${e.client.nickname}`)
        queryClient.removeQueries({queryKey: queryKey.clients})
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(logger.warn)
        }).catch(logger.warn)
    })

    logger.info("ts Connected")
    return ts
}


export const getTsInstance = async (vars: TsApiTs3) => queryClient.fetchQuery({
    queryKey: queryKey.tsInstance,
    queryFn: () => tsConnect(vars),
    staleTime: Infinity,
    gcTime: Infinity,
})
