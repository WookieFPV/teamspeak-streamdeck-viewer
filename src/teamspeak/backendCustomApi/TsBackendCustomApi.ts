import wretch, { type Wretch } from "wretch";
import WebSocket from "ws";
import type { TsApiCustom } from "~/envVars";
import { wait } from "~/utils/helper";
import { logger } from "~/utils/logger";
import type { TsBackend } from "../BackendFactory";
import { queryClient, queryKey } from "../queryClient";
import type { TeamSpeakClient } from "../teamspeakTypes";
import { TsDrawClients } from "../tsDrawClients";
import type { TsWsEvent } from "./WsEvent";
import { getClientsQuery } from "./tsCustomApi";

export class TsBackendCustomApi implements TsBackend {
	private readonly vars: TsApiCustom;
	private readonly wretch: Wretch;
	private socket: WebSocket;

	constructor(vars: TsApiCustom) {
		logger.info("BACKEND_TYPE: Custom");
		this.vars = vars;
		this.wretch = wretch(vars.BACKEND_URL)
			.auth(`Bearer ${vars.BACKEND_TOKEN}`)
			.options({ credentials: "include", mode: "cors" });

		this.socket = this.initWS();
		this.socket.onopen = () => {
			logger.info("[WS] Connected");
		};

		this.socket.onerror = (error) => {
			logger.info("onerror");
			logger.warn(error);
			this.socket.close();

			wait(1000).then(() => {
				logger.info("reconnect...");
				this.socket = this.initWS();
			});
		};
		this.socket.onmessage = (_event) => {
			if (typeof _event.data !== "string")
				return logger.info(`Invalid ws event (must be obj) not ${_event.data}`);
			this.handleSocketMessage(_event);
		};
	}
	initWS() {
		return new WebSocket(this.vars.BACKEND_WS_URL, {
			headers: { Authorization: `Bearer ${this.vars.BACKEND_TOKEN}` },
		});
	}

	private handleSocketMessage(data: unknown) {
		if (typeof data !== "string") {
			return logger.info(
				`Invalid ws event (must be string) not ${typeof data}`,
			);
		}

		try {
			const wsEvent = JSON.parse(data) as TsWsEvent;
			this.processWebSocketEvent(wsEvent);
		} catch (error) {
			logger.warn("Error parsing WebSocket message:", error);
		}
	}

	private processWebSocketEvent(event: TsWsEvent) {
		switch (event.type) {
			case "clientConnect":
				this.handleClientConnect(event.e.client);
				break;
			case "clientDisconnect":
				this.handleClientDisconnect(event.e.client);
				break;
			case "clientMoved":
				this.handleClientMoved(event.e.client, event.e.channel);
				break;
			case "connected":
				logger.info("WebSocket connected");
				break;
			default:
				logger.info(`Unknown event: ${JSON.stringify(event)}`);
		}
	}

	private handleClientConnect(client: TeamSpeakClient | undefined) {
		if (!client) return;
		logger.info(`Client connect: ${client.clientNickname}`);
		this.updateClientList((oldData) => [...(oldData || []), client]);
		this.refreshAndDrawClients();
	}

	private handleClientDisconnect(client: TeamSpeakClient | undefined) {
		if (!client) return;
		logger.info(`Client disconnect: ${client.clientNickname}`);
		this.updateClientList((oldData) =>
			(oldData || []).filter(
				(c) => c.clientUniqueIdentifier !== client.clientUniqueIdentifier,
			),
		);
		this.refreshAndDrawClients();
	}

	private handleClientMoved(
		client: TeamSpeakClient,
		channel: { channelName: string },
	) {
		logger.info(
			`Client moved: ${client.clientNickname} [${channel.channelName}]`,
		);
		this.refreshAndDrawClients();
	}

	private updateClientList(
		updater: (oldData: TeamSpeakClient[] | undefined) => TeamSpeakClient[],
	) {
		queryClient.setQueryData<TeamSpeakClient[]>(queryKey.clients, updater);
	}

	private async refreshAndDrawClients() {
		try {
			const clients = await this.getClients({ forceRefresh: true });
			await TsDrawClients(clients);
		} catch (error) {
			logger.warn("Error refreshing clients:", error);
		}
	}

	async getClients(args: { forceRefresh?: boolean }): Promise<
		TeamSpeakClient[]
	> {
		return getClientsQuery(args, this.wretch);
	}
}
