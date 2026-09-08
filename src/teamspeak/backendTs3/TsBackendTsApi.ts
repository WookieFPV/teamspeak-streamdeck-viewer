import type { TsApiTs3 } from "~/envVars";
import { daysToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import type { TsBackend } from "../BackendFactory";
import { queryClient, queryKey } from "../queryClient";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { getTsInstance } from "./getTsInstance";
import { filterAndMapTs3Clients } from "./ts3ClientMapper";

export class TsBackendTsApi implements TsBackend {
  vars: TsApiTs3;

  constructor(vars: TsApiTs3) {
    logger.info("BACKEND_TYPE: TS3");
    this.vars = vars;
  }

  // `forceRefresh` (see `TsBackend`) is accepted but no longer needed:
  // every call fetches fresh, so there is nothing to force.
  async getClients(): Promise<TeamSpeakClient[]> {
    const ts = await getTsInstance(this.vars);
    return queryClient.fetchQuery<TeamSpeakClient[]>({
      queryKey: queryKey.clients,
      queryFn: async () => {
        logger.info("TS3 API clientList:");
        const rawClients = await ts.clientList();
        const clients = filterAndMapTs3Clients(rawClients);
        logger.info(JSON.stringify(clients.map((c) => c.clientNickname)));
        return clients;
      },
      // Always fetch fresh: the main loop's polling delay (see
      // `getPollingDelay`) is the throttle. A long staleTime here used to
      // make polling a no-op returning cached data while still sleeping
      // between polls. `forceRefresh` is kept for API compatibility.
      staleTime: 0,
      gcTime: daysToMs(1),
    });
  }
}
