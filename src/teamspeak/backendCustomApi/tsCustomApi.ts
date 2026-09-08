import type { Wretch } from "wretch";
import { addLastActiveTime } from "~/teamspeak/addLastActiveTime";
import { hoursToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import { queryClient, queryKey } from "../queryClient";
import type { TeamSpeakClient } from "../teamspeakTypes";

export const getClientsQuery = (
  _args: { forceRefresh?: boolean },
  wretch: Wretch,
) =>
  queryClient.fetchQuery<TeamSpeakClient[]>({
    queryKey: queryKey.clients,
    queryFn: async (): Promise<TeamSpeakClient[]> => {
      logger.debug("TS3 API clientList:");
      const clients = await wretch.get("/ts/users").json<TeamSpeakClient[]>();
      logger.debug(JSON.stringify(clients.map((c) => `${c.clientNickname}`)));
      return addLastActiveTime(clients, Date.now());
    },
    // Always fetch fresh when explicitly asked: the main loop's polling
    // delay plus the websocket events are the throttle. A long staleTime
    // here used to make polling return cached data (up to 60s old, so the
    // talking indicator lagged) while still sleeping between polls.
    // `forceRefresh` is kept for API compatibility (every call is a refresh).
    staleTime: 0,
    gcTime: hoursToMs(1),
  });
