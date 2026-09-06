import wretch, { type Wretch } from "wretch";
import WebSocket from "ws";
import { config } from "~/config";
import type { TsApiCustom } from "~/envVars";
import { logger } from "~/utils/logger";
import { addLastActiveTime } from "../addLastActiveTime";
import type { TsBackend } from "../BackendFactory";
import { queryClient, queryKey } from "../queryClient";
import { clientType, type TeamSpeakClient } from "../teamspeakTypes";
import { TsDrawClients } from "../tsDrawClients";
import { getClientsQuery } from "./tsCustomApi";
import type { TsWsEvent } from "./WsEvent";

export class TsBackendCustomApi implements TsBackend {
  private readonly vars: TsApiCustom;
  private readonly wretch: Wretch;
  private socket: WebSocket | undefined;
  /**
   * Incremented for every socket we create. Handlers of a superseded socket
   * check it and bail out, otherwise a late `onclose` of an old socket would
   * start a second reconnect chain and we would end up with two live sockets.
   */
  private generation = 0;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private reconnectAttempt = 0;
  private watchdogTimer: NodeJS.Timeout | undefined;
  private lastMessageAt = 0;
  /** only watch for silence once we know the server sends heartbeats */
  private heartbeatSeen = false;

  constructor(vars: TsApiCustom) {
    logger.info("BACKEND_TYPE: Custom");
    this.vars = vars;
    this.wretch = wretch(vars.BACKEND_URL)
      .auth(`Bearer ${vars.BACKEND_TOKEN}`)
      .options({ credentials: "include", mode: "cors" });

    this.connect();
  }

  private connect() {
    this.closeSocket();
    const generation = ++this.generation;
    this.lastMessageAt = Date.now();
    logger.info(`[WS] connect (#${generation})`);

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.vars.BACKEND_WS_URL, {
        headers: { Authorization: `Bearer ${this.vars.BACKEND_TOKEN}` },
      });
    } catch (error) {
      // a throw here used to kill the reconnect chain for good
      logger.warn(`[WS] could not create socket: ${String(error)}`);
      this.scheduleReconnect("socket creation failed");
      return;
    }
    this.socket = socket;

    const isCurrent = () => generation === this.generation;

    socket.onopen = () => {
      if (!isCurrent()) return;
      logger.info(`[WS] onopen (#${generation})`);
      this.reconnectAttempt = 0;
      this.lastMessageAt = Date.now();
      this.startWatchdog();
      // We were not listening while the socket was down, so anything that
      // happened in the meantime was missed. Without this refresh the deck
      // keeps showing whatever it had before the connection dropped.
      void this.resync("websocket (re)connected");
    };

    socket.onerror = (error) => {
      if (!isCurrent()) return;
      logger.warn(`[WS] onerror (#${generation}): ${error.message}`);
    };

    socket.onclose = (event) => {
      if (!isCurrent()) return;
      logger.info(`[WS] onclose (#${generation}) code: ${event.code}`);
      this.scheduleReconnect(`closed with code ${event.code}`);
    };

    socket.onmessage = (event) => {
      if (!isCurrent()) return;
      this.lastMessageAt = Date.now();
      if (typeof event.data !== "string")
        return logger.info(
          `Invalid ws event (must be string) not ${typeof event.data} -> "${event.data}"`,
        );
      this.handleSocketMessage(event.data);
    };

    // protocol level ping frames also prove the connection is alive
    socket.on("ping", () => {
      this.lastMessageAt = Date.now();
    });
  }

  /** removes all handlers of the current socket and terminates it */
  private closeSocket() {
    const socket = this.socket;
    this.socket = undefined;
    if (!socket) return;
    socket.onopen = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.onmessage = null;
    socket.removeAllListeners();
    socket.terminate();
  }

  private scheduleReconnect(reason: string) {
    if (this.reconnectTimer) return; // a reconnect is already pending
    this.stopWatchdog();
    this.closeSocket();

    this.reconnectAttempt++;
    const backoff = Math.min(
      config.ws.reconnectMinDelayMs * 2 ** (this.reconnectAttempt - 1),
      config.ws.reconnectMaxDelayMs,
    );
    const delay = Math.round(backoff * (0.8 + Math.random() * 0.4));
    logger.info(
      `[WS] reconnect #${this.reconnectAttempt} in ${Math.round(delay / 1000)}s (${reason})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  /**
   * An open socket is no proof that events still arrive: a half open tcp
   * connection (wifi drop, NAT timeout) looks perfectly fine on this side. If
   * the server stops talking to us we tear the connection down ourselves.
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (!this.heartbeatSeen) return;
      const silentFor = Date.now() - this.lastMessageAt;
      if (silentFor < config.ws.staleAfterMs) return;
      logger.warn(
        `[WS] no message for ${Math.round(silentFor / 1000)}s, connection looks dead`,
      );
      this.scheduleReconnect("heartbeat timeout");
    }, config.ws.watchdogIntervalMs);
    this.watchdogTimer.unref?.();
  }

  private stopWatchdog() {
    if (!this.watchdogTimer) return;
    clearInterval(this.watchdogTimer);
    this.watchdogTimer = undefined;
  }

  private handleSocketMessage(data: string) {
    logger.debug(`[WS] ws msg: ${data}`);
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
      case "tsDisconnected":
        // the api server lost teamspeak, our data can be stale from here on
        logger.warn(`[WS] api server lost teamspeak: ${event.reason}`);
        break;
      case "tsReconnected":
        logger.info(
          `[WS] api server reconnected to teamspeak (${event.repaired} repaired event(s))`,
        );
        void this.resync("api server reconnected to teamspeak");
        break;
      case "heartbeat":
        this.heartbeatSeen = true;
        logger.debug(
          `[WS] heartbeat (ts: ${event.tsConnected}, clients: ${event.clientCount})`,
        );
        break;
      default:
        logger.info(`Unknown event: ${JSON.stringify(event)}`);
    }
  }

  /** throws away the cached list and repaints from the api */
  private async resync(reason: string) {
    logger.info(`[WS] resync: ${reason}`);
    await this.refreshAndDrawClients();
  }

  private handleClientConnect(client: TeamSpeakClient | undefined) {
    if (!client || client.clientType !== clientType.normalUser) return;
    logger.info(`[WS]: Client connect: ${client.clientNickname}`);
    this.updateClientList((oldData) => {
      const others = (oldData || []).filter(
        (c) => c.clientUniqueIdentifier !== client.clientUniqueIdentifier,
      );
      // clientLastActiveTime is added by the api query, an event does not have
      // it - without it the key would render an idle time of NaN
      return [...others, ...addLastActiveTime([client], Date.now())];
    });
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

  async getClients(args: {
    forceRefresh?: boolean;
  }): Promise<TeamSpeakClient[]> {
    return getClientsQuery(args, this.wretch);
  }
}
