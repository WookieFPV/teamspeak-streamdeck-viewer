import type { TsApiTs3 } from "~/envVars";
import { daysToMs } from "~/utils/dateHelpers";
import { logger } from "~/utils/logger";
import type { TsBackend } from "../BackendFactory";
import { queryClient, queryKey } from "../queryClient";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { isMainUser } from "../tsHelper";
import { getTsInstance } from "./getTsInstance";
import { filterAndMapTs3Clients } from "./ts3ClientMapper";

export class TsBackendTsApi implements TsBackend {
	vars: TsApiTs3;

	constructor(vars: TsApiTs3) {
		logger.info("BACKEND_TYPE: TS3");
		this.vars = vars;
	}

	async getClients({
		forceRefresh,
	}: { forceRefresh?: boolean } = {}): Promise<TeamSpeakClient[]> {
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
			staleTime: ({ state: { data = [] } }) => {
				if (forceRefresh) return 0;
				if (data.find(isMainUser)) return 0;
				return daysToMs(1);
			},
			gcTime: daysToMs(1),
		});
	}
}
