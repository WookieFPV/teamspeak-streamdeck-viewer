import { z } from "zod";
import { addLastActiveTime } from "~/teamspeak/addLastActiveTime";
import { logger } from "~/utils/logger";
import { Store } from "~/utils/store";
import { type TeamSpeakClient, teamSpeakClientSchema } from "../teamspeakTypes";

const usersResponseSchema = z.array(teamSpeakClientSchema);

export interface CustomApiAuth {
  baseUrl: string;
  token: string;
}

export class CustomApiClient {
  readonly clientStore = new Store<TeamSpeakClient[]>();

  constructor(private readonly auth: CustomApiAuth) {}

  async getClients({
    forceRefresh,
  }: {
    forceRefresh?: boolean;
  } = {}): Promise<TeamSpeakClient[]> {
    // Always fetch fresh: the main loop's polling delay plus the websocket
    // events are the throttle. A long stale window here used to make polling
    // return cached data (up to 60s old, so the talking indicator lagged)
    // while still sleeping between polls.
    return this.clientStore.fetch(() => this.fetchClients(), {
      forceRefresh,
      staleMs: 0,
    });
  }

  /** drop the cache so the next getClients() hits the api */
  invalidate() {
    this.clientStore.invalidate();
  }

  private async fetchClients(): Promise<TeamSpeakClient[]> {
    logger.debug("TS3 API clientList:");
    const res = await fetch(`${this.auth.baseUrl}/ts/users`, {
      headers: { Authorization: `Bearer ${this.auth.token}` },
    });
    if (!res.ok) {
      throw new Error(`GET /ts/users failed: ${res.status} ${res.statusText}`);
    }
    const clients = usersResponseSchema.parse(await res.json());
    logger.debug(JSON.stringify(clients.map((c) => `${c.clientNickname}`)));
    return addLastActiveTime(clients, Date.now());
  }
}
