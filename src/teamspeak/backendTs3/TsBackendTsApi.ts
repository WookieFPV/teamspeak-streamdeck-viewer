import {TsBackend} from "../BackendFactory";
import {TsApiTs3} from "~/envVars";
import {TeamSpeakClient} from "../teamspeakTypes";
import {queryClient, queryKey} from "../queryClient";
import {isMainUser} from "../tsHelper";
import {daysToMs} from "~/utils/dateHelpers";
import {filterAndMapTs3Clients} from "./ts3ClientMapper";
import {getTsInstance} from "./getTsInstance";


export class TsBackendTsApi implements TsBackend {
    vars: TsApiTs3

    constructor(vars: TsApiTs3) {
        console.log("BACKEND_TYPE: TS3")
        this.vars = vars
    }

    async getClients({forceRefresh}: { forceRefresh?: boolean } = {}): Promise<TeamSpeakClient[]> {
        const ts = await getTsInstance(this.vars);
        return queryClient.fetchQuery<TeamSpeakClient[]>({
            queryKey: queryKey.clients, queryFn: async () => {
                console.log("TS3 API clientList:")
                const rawClients = await ts.clientList()
                const clients = filterAndMapTs3Clients(rawClients)
                console.log(JSON.stringify(clients.map(c => c.clientNickname)))
                return clients
            },
            staleTime: ({state: {data = []}}) => {
                if (forceRefresh) return 0
                if (data.find(isMainUser)) return 0
                return daysToMs(1)
            },
            gcTime: daysToMs(1)
        })

    }

}


