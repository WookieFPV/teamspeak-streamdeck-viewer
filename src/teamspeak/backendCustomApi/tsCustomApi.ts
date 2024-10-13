import {Wretch} from "wretch"
import {TeamSpeakClient} from "../teamspeakTypes";
import {queryClient, queryKey} from "../queryClient";
import {isMainUser} from "../tsHelper";
import {daysToMs, hoursToMs, minsToMs} from "~/utils/dateHelpers";
import {logger} from "~/utils/logger";
import {addLastActiveTime} from "~/teamspeak/addLastActiveTime";

export const getClientsQuery = ({forceRefresh}: {
    forceRefresh?: boolean
}, wretch: Wretch) => queryClient.fetchQuery<TeamSpeakClient[]>({
    queryKey: queryKey.clients,
    queryFn: async (): Promise<TeamSpeakClient[]> => {
        logger.info("TS3 API clientList:")
        const clients = await wretch.get("/ts/users").json<TeamSpeakClient[]>()
        logger.info(JSON.stringify(clients.map(c => c.clientNickname)))
        return addLastActiveTime(clients, Date.now())
    },
    staleTime: ({state: {data = []}}) => {
        if (forceRefresh) return 0
        if (data.find(isMainUser)) return 0
        return daysToMs(1)
    },
    gcTime: hoursToMs(1)
})
