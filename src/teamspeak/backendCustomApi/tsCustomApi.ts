import {Wretch} from "wretch"
import {TeamSpeakClient} from "../teamspeakTypes";
import {queryClient, queryKey} from "../queryClient";
import {isMainUser} from "../tsHelper";
import {daysToMs, hoursToMs, minsToMs} from "~/utils/dateHelpers";

export const getClientsQuery = ({forceRefresh}: {
    forceRefresh?: boolean
}, wretch: Wretch) => queryClient.fetchQuery<TeamSpeakClient[]>({
    queryKey: queryKey.clients,
    queryFn: async () => {
        console.log("TS3 API clientList:")
        const clients = await wretch.get("/ts/users").json<TeamSpeakClient[]>()
        console.log(JSON.stringify(clients.map(c => c.clientNickname)))
        return clients
    },
    staleTime: ({state: {data = []}}) => {
        if (forceRefresh) return 0
        if (data.find(isMainUser)) return 0
        return daysToMs(1)
    },
    gcTime: hoursToMs(1)
})
