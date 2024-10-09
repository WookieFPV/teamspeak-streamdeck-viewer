import {TsApiTs3} from "~/envVars";
import {QueryProtocol, TeamSpeak} from "ts3-nodejs-library";
import {queryClient, queryKey} from "../queryClient";
import {filterAndMapTs3Clients} from "./ts3ClientMapper";
import {TsDrawClients} from "../tsDrawClients";

const tsConnect = async (vars: TsApiTs3) => {
    console.log(`ts connect (${vars.TS3_HOST})`)
    const ts = await TeamSpeak.connect({
        host: vars.TS3_HOST,
        queryport: 10011,
        serverport: 9987,
        protocol: QueryProtocol.RAW,
        username: vars.TS3_USERNAME,
        nickname: vars.TS3_NICKNAME,
        password: vars.TS3_PASSWORD,
    }).catch(e => {
        console.log("tsConnect error", e)
        throw e
    })

    ts.on("error", e => {
        console.log(`ts3 error: ${e}`)
        queryClient.removeQueries({queryKey: queryKey.tsInstance})
    })
    ts.on("close", async (error): Promise<void> => {
        console.log(`disconnected ${error}`);
        console.warn(error)
        queryClient.removeQueries({queryKey: queryKey.tsInstance})
    });
    ts.on("clientconnect", e => {
        console.log(`ts3 clientconnect: ${e.client.nickname}`)
        queryClient.removeQueries({queryKey: queryKey.clients})
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(console.warn)
        })
    })
    ts.on("clientdisconnect", e => {
        console.log(`ts3 clientdisconnect: ${e.client?.nickname}`)
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(console.warn)
        })
    })
    ts.on("clientmoved", e => {
        console.log(`ts3 clientmoved: ${e.client.nickname}`)
        queryClient.removeQueries({queryKey: queryKey.clients})
        ts.clientList().then(rawClients => {
            TsDrawClients(filterAndMapTs3Clients(rawClients)).catch(console.warn)
        })
    })

    console.log("ts Connected")
    return ts
}


export const getTsInstance = async (vars: TsApiTs3) => queryClient.fetchQuery({
    queryKey: queryKey.tsInstance,
    queryFn: () => tsConnect(vars),
    staleTime: Infinity,
    gcTime: Infinity,
})
