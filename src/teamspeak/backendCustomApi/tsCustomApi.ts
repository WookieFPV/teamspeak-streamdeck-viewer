import type { Wretch } from "wretch";
import { addLastActiveTime } from "~/teamspeak/addLastActiveTime";
import { hoursToMs, sToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import { queryClient, queryKey } from "../queryClient";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { isMainUser } from "../tsHelper";

export const getClientsQuery = (
  { forceRefresh }: { forceRefresh?: boolean },
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
    staleTime: ({ state: { data = [] } }) => {
      if (forceRefresh) return 0;
      if (data.find(isMainUser)) return 0;
      return sToMs(60);
    },
    gcTime: hoursToMs(1),
  });
