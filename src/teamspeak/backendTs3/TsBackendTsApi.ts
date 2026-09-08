import type { TeamSpeak } from "ts3-nodejs-library";
import type { EnvVars } from "~/envVars";
import { isShuttingDown } from "~/streamdeck/shutdown";
import { daysToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import { Store } from "~/utils/store";
import type { TsBackend } from "../BackendFactory";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { TsDrawClients } from "../tsDrawClients";
import { isMainUser } from "../tsHelper";
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
          onClientsChanged: () => {
            this.clientStore.invalidate();
            void this.refreshAndDrawClients();
          },
        }),
      { staleMs: Number.POSITIVE_INFINITY },
    );
    // while the main user is around every poll is fresh; otherwise the list
    // barely changes, so a long cache keeps the query connection quiet
    const cached = this.clientStore.get();
    const staleMs = forceRefresh || cached?.find(isMainUser) ? 0 : daysToMs(1);
    return this.clientStore.fetch(
      async () => {
        logger.info("TS3 API clientList:");
        const rawClients = await ts.clientList();
        const clients = filterAndMapTs3Clients(rawClients);
        logger.info(JSON.stringify(clients.map((c) => c.clientNickname)));
        return clients;
      },
      { forceRefresh, staleMs },
    );
  }

  private async refreshAndDrawClients() {
    try {
      const clients = await this.getClients({ forceRefresh: true });
      if (isShuttingDown()) return;
      await TsDrawClients(clients);
    } catch (error) {
      logger.warn("Error refreshing clients:", error);
    }
  }
}
