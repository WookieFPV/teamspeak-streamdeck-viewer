import {TsBackend} from "../BackendFactory";
import wretch, {Wretch} from "wretch"
import {TsApiCustom} from "~/envVars";
import {TeamSpeakClient} from "../teamspeakTypes";
import WebSocket from "ws";
import {TsWsEvent} from "./WsEvent";
import {TsDrawClients} from "../tsDrawClients";
import {getClientsQuery} from "./tsCustomApi";
import {logger} from "~/utils/logger";

export class TsBackendCustomApi implements TsBackend {
    vars: TsApiCustom

    wretch: Wretch
    socket

    constructor(vars: TsApiCustom) {
        logger.info("BACKEND_TYPE: Custom")
        this.vars = vars
        this.wretch = wretch(vars.BACKEND_URL)
            .auth(`Bearer ${vars.BACKEND_TOKEN}`)
            .options({credentials: "include", mode: "cors"})

        this.socket = new WebSocket(vars.BACKEND_WS_URL, {headers: {Authorization: `Bearer ${vars.BACKEND_TOKEN}`}});

        this.socket.onopen = () => {
            logger.info("[WS] Connected");
        };

        this.socket.onerror = (error) => {
            logger.info("onerror")
            logger.warn(error)
        }
        this.socket.onmessage = (_event) => {
            if (typeof _event.data !== "string") return logger.info(`Invalid ws event (must be obj) not ${_event.data}`)

            const event = JSON.parse(_event.data) as TsWsEvent
            switch (event.type) {
                case "clientConnect":
                    logger.info(`client connect: ${event.e.client.clientNickname}`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(logger.warn)
                    break
                case "clientDisconnect":
                    logger.info(`client disconnect: ${event.e.client?.clientNickname}`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(logger.warn)

                    break
                case "clientMoved":
                    logger.info(`client moved: ${event.e.client?.clientNickname} [${event.e.channel.channelName}]`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(logger.warn)
                    break
                case "connected":
                    logger.info(`connected`)
                    break
                default:
                    logger.info(`unknown event: ${event} ${JSON.stringify(event)}`)
            }
        }
    }

    getClients(args: { forceRefresh?: boolean }): Promise<TeamSpeakClient[]> {
        return getClientsQuery(args, this.wretch)
    }

}
