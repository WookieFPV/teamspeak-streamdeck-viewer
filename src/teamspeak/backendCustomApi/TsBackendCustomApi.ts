import wretch, { type Wretch } from "wretch";
import WebSocket from "ws";
import type { TsApiCustom } from "~/envVars";
import { wait } from "~/utils/helper";
import { logger } from "~/utils/logger";
import type { TsBackend } from "../BackendFactory";
import { queryClient, queryKey } from "../queryClient";
import { type TeamSpeakClient, clientType } from "../teamspeakTypes";
import { TsDrawClients } from "../tsDrawClients";
import type { TsWsEvent } from "./WsEvent";
import { getClientsQuery } from "./tsCustomApi";

export class TsBackendCustomApi implements TsBackend {
  private readonly vars: TsApiCustom;
  private readonly wretch: Wretch;
  private socket: WebSocket | undefined;

  constructor(vars: TsApiCustom) {
    logger.info("BACKEND_TYPE: Custom");
    this.vars = vars;
    this.wretch = wretch(vars.BACKEND_URL)
      .auth(`Bearer ${vars.BACKEND_TOKEN}`)
      .options({ credentials: "include", mode: "cors" });

    this.socket = this.initWS();
  }

  initWS() {
    if (this.socket) {
      logger.info("[WS] initWS but before close already existing socket");
      this.socket.terminate();
    }
    logger.info("[WS] initWS");
    const socket = new WebSocket(this.vars.BACKEND_WS_URL, {
      headers: { Authorization: `Bearer ${this.vars.BACKEND_TOKEN}` },
    });
    socket.onopen = () => {
      logger.info("[WS] onopen");
    };

    socket.onerror = (error) => {
      logger.info("[WS] onerror");
      logger.warn(error);
    };
    socket.onclose = async (_event) => {
      logger.info("[WS] onclose... reconnect in 5s");
      socket.terminate();
      await wait(10000);
      logger.info("[WS] reconnect...");
      try {
        this.socket = this.initWS();
        logger.info(`[WS] readyState B: ${this.socket.readyState}`);
      } catch (e) {
        logger.info(`[WS] readyState C: ${this.socket?.readyState}`);
      }
    };
    socket.onmessage = (_event) => {
      if (typeof _event.data !== "string")
        return logger.info(
          `Invalid ws event (must be string) not ${typeof _event.data} -> "${_event.data}"`,
        );
      this.handleSocketMessage(_event.data);
    };
    return socket;
  }

  private handleSocketMessage(data: string) {
    logger.info("[WS] ws msg:", data);
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
        logger.info("[WS] WebSocket connected msg");
        break;
      default:
        logger.info(`Unknown event: ${JSON.stringify(event)}`);
    }
  }

  private handleClientConnect(client: TeamSpeakClient | undefined) {
    if (!client || client.clientType !== clientType.normalUser) return;
    logger.info(`[WS]: Client connect: ${client.clientNickname}`);
    this.updateClientList((oldData) => [...(oldData || []), client]);
    this.refreshAndDrawClients();
  }

  private handleClientDisconnect(client: TeamSpeakClient | undefined) {
    if (!client || client.clientType !== clientType.normalUser) return;
    logger.info(`[WS]: Client disconnect: ${client.clientNickname}`);
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
      `[WS]: Client moved: ${client.clientNickname} [${channel.channelName}]`,
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
