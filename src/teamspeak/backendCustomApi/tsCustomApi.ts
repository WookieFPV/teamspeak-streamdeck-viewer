import { z } from "zod";
import { addLastActiveTime } from "~/teamspeak/addLastActiveTime";
import { sToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import { Store } from "~/utils/store";
import { type TeamSpeakClient, teamSpeakClientSchema } from "../teamspeakTypes";
import { isMainUser } from "../tsHelper";

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
    // while the main user is around every poll is fresh (they move/talk
    // constantly); otherwise a 60s cache keeps the api quiet
    const cached = this.clientStore.get();
    const staleMs = forceRefresh || cached?.find(isMainUser) ? 0 : sToMs(60);
    return this.clientStore.fetch(() => this.fetchClients(), {
      forceRefresh,
      staleMs,
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
