import type { TeamSpeak } from "ts3-nodejs-library";
import type { EnvVars } from "~/envVars";
import { logger } from "~/utils/logger";
import { requestRefresh } from "~/utils/refreshTrigger";
import { Store } from "~/utils/store";
import type { TsBackend } from "../BackendFactory";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { connectTs } from "./getTsInstance";
import { filterAndMapTs3Clients } from "./ts3ClientMapper";

export class TsBackendTsApi implements TsBackend {
  private readonly tsStore = new Store<TeamSpeak>();
  private readonly clientStore = new Store<TeamSpeakClient[]>();

  constructor(
    private readonly vars: Extract<EnvVars, { BACKEND_TYPE: "ts3" }>,
  ) {
    logger.info("BACKEND_TYPE: TS3");
  }

  async getClients({
    forceRefresh,
  }: {
    forceRefresh?: boolean;
  } = {}): Promise<TeamSpeakClient[]> {
    const ts = await this.tsStore.fetch(
      () =>
        connectTs(this.vars, {
          onConnectionLost: () => this.tsStore.invalidate(),
          // Only invalidate + wake: the main loop is the sole painter and
          // repaints immediately on wake. Painting directly from here used
          // to race the main loop with no ordering guarantee.
          onClientsChanged: () => {
            this.clientStore.invalidate();
            requestRefresh();
          },
        }),
      { staleMs: Number.POSITIVE_INFINITY },
    );
    // Always fetch fresh: the main loop's polling delay is the throttle. A
    // long staleTime here used to make polling return cached data (up to a
    // day old) while still sleeping between polls.
    return this.clientStore.fetch(
      async () => {
        logger.info("TS3 API clientList:");
        const rawClients = await ts.clientList();
        const clients = filterAndMapTs3Clients(rawClients);
        logger.info(JSON.stringify(clients.map((c) => c.clientNickname)));
        return clients;
      },
      { forceRefresh, staleMs: 0 },
    );
  }
}
