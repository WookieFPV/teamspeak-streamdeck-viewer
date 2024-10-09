import {QueryClient} from "@tanstack/query-core";
import {ts3Api} from "./tsApi";
import {daysToMs, hoursToMs} from "../utils/dateHelpers";
import {isMainUser} from "./tsHelper";
import {config} from "../config";

export const tsQueryClient = new QueryClient()

export const queryKey = {
    clients: ["clients"],
    channels: ["channels"]
}

export const getTsClients = async ({forceRefresh}: { forceRefresh?: boolean } = {}) => tsQueryClient.fetchQuery({
    queryKey: queryKey.channels,
    queryFn: ts3Api.getClients,
    staleTime: ({state: {data = []}}) => {
        if (forceRefresh) return 0
        if (data.find(isMainUser)) return 0 //config.idleTimeMainUserOnlineMs;
        return daysToMs(1)
    },
    gcTime: daysToMs(1)
})

export const getTsChannels = async ({staleTime = hoursToMs(1)}: {
    staleTime?: number
} = {}) => tsQueryClient.fetchQuery({
    queryKey: queryKey.channels,
    queryFn: ts3Api.getClients,
    staleTime,
    gcTime: daysToMs(1)
})
