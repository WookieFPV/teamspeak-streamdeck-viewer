import { config } from "~/config";
import type { TsApiCustom } from "~/envVars";
import { logger } from "~/utils/logger";
import { requestRefresh } from "~/utils/refreshTrigger";
import type { TsBackend } from "../BackendFactory";
import { clientType, type TeamSpeakClient } from "../teamspeakTypes";
import { CustomApiClient } from "./tsCustomApi";
import { parseWsEvent, type TsWsEvent } from "./WsEvent";

/**
 * The WHATWG `WebSocket` (bun and node both ship it) cannot send custom
 * handshake headers, so the bearer token goes as an `access_token` query
 * parameter instead of the `Authorization` header the old `ws` client used.
 * The api server must accept query-param auth for the socket to connect.
 */
const wsUrlWithToken = (base: string, token: string): string => {
  const url = new URL(base);
  url.searchParams.set("access_token", token);
  return url.toString();
};

export class TsBackendCustomApi implements TsBackend {
  private readonly api: CustomApiClient;
  private readonly wsUrl: string;
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
    this.api = new CustomApiClient({
      baseUrl: vars.BACKEND_URL,
      token: vars.BACKEND_TOKEN,
    });
    this.wsUrl = wsUrlWithToken(vars.BACKEND_WS_URL, vars.BACKEND_TOKEN);

    this.connect();
  }

  private connect() {
    this.closeSocket();
    const generation = ++this.generation;
    this.lastMessageAt = Date.now();
    logger.info(`[WS] connect (#${generation})`);

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.wsUrl);
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
      this.resync("websocket (re)connected");
    };

    socket.onerror = () => {
      if (!isCurrent()) return;
      logger.warn(`[WS] onerror (#${generation})`);
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
          `[WS] invalid ws event (must be string) not ${typeof event.data}`,
        );
      this.handleSocketMessage(event.data);
    };
  }

  /** detaches all handlers of the current socket and closes it */
  private closeSocket() {
    const socket = this.socket;
    this.socket = undefined;
    if (!socket) return;
    socket.onopen = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.onmessage = null;
    socket.close();
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
      this.processWebSocketEvent(parseWsEvent(data));
    } catch (error) {
      logger.warn(`[WS] dropping invalid event ${data}: ${String(error)}`);
    }
  }

  private processWebSocketEvent(event: TsWsEvent): void {
    switch (event.type) {
      case "clientConnect":
        this.handleClientConnect(event.e.client);
        break;
      case "clientDisconnect":
        this.handleClientDisconnect(event.e.client);
        break;
      case "clientMoved":
        this.handleClientMoved(event.e.client, event.e.channel.channelName);
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
        this.resync("api server reconnected to teamspeak");
        break;
      case "heartbeat":
        this.heartbeatSeen = true;
        logger.debug(
          `[WS] heartbeat (ts: ${event.tsConnected}, clients: ${event.clientCount})`,
        );
        break;
      default: {
        const _exhaustive: never = event;
        logger.info(`Unknown event: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  /**
   * Every websocket event funnels through here: invalidate the cache and
   * wake the main loop, which refetches and repaints immediately. The
   * backend never paints directly, so there is exactly one painter and
   * concurrent paints can't interleave.
   */
  private triggerRefresh(reason: string) {
    logger.info(`[WS] refresh: ${reason}`);
    this.api.invalidate();
    requestRefresh();
  }

  /** throws away the cached list and repaints from the api */
  private resync(reason: string) {
    this.triggerRefresh(reason);
  }

  private handleClientConnect(client: TeamSpeakClient | undefined) {
    if (client && client.clientType !== clientType.normalUser) return;
    logger.info(`[WS]: Client connect: ${client?.clientNickname ?? "?"}`);
    this.triggerRefresh("client connected");
  }

  private handleClientDisconnect(client: TeamSpeakClient | undefined) {
    if (client && client.clientType !== clientType.normalUser) return;
    logger.info(`[WS]: Client disconnect: ${client?.clientNickname ?? "?"}`);
    this.triggerRefresh("client disconnected");
  }

  private handleClientMoved(client: TeamSpeakClient, channelName: string) {
    logger.info(
      `[WS]: Client moved: ${client.clientNickname} [${channelName}]`,
    );
    this.triggerRefresh("client moved");
  }

  async getClients(args: {
    forceRefresh?: boolean;
  }): Promise<TeamSpeakClient[]> {
    return this.api.getClients(args);
  }
}
