import {TsBackend} from "../BackendFactory";
import wretch, {Wretch} from "wretch"
import {TsApiCustom} from "~/envVars";
import {TeamSpeakClient} from "../teamspeakTypes";
import WebSocket from "ws";
import {TsWsEvent} from "./WsEvent";
import {TsDrawClients} from "../tsDrawClients";
import {getClientsQuery} from "./tsCustomApi";

export class TsBackendCustomApi implements TsBackend {
    vars: TsApiCustom

    wretch: Wretch
    socket

    constructor(vars: TsApiCustom) {
        console.log("BACKEND_TYPE: Custom")
        this.vars = vars
        this.wretch = wretch(vars.BACKEND_URL)
            .auth(`Bearer ${vars.BACKEND_TOKEN}`)
            .options({credentials: "include", mode: "cors"})

        this.socket = new WebSocket(vars.BACKEND_WS_URL, {headers: {Authorization: `Bearer ${vars.BACKEND_TOKEN}`}});

        this.socket.onopen = () => {
            console.log("[WS] Connected");
        };

        this.socket.onerror = (error) => {
            console.log("onerror")
            console.log(error)
        }
        this.socket.onmessage = (_event) => {
            if (typeof _event.data !== "string") return console.log(`Invalid ws event (must be obj) not ${_event.data}`)

            const event = JSON.parse(_event.data) as TsWsEvent
            switch (event.type) {
                case "clientConnect":
                    console.log(`client connect: ${event.e.client.clientNickname}`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(console.warn)
                    break
                case "clientDisconnect":
                    console.log(`client disconnect: ${event.e.client?.clientNickname}`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(console.warn)

                    break
                case "clientMoved":
                    console.log(`client moved: ${event.e.client?.clientNickname} [${event.e.channel.channelName}]`)
                    this.getClients({forceRefresh: true}).then((clients) => TsDrawClients(clients)).catch(console.warn)
                    break
                case "connected":
                    console.log(`connected`)
                    break
                default:
                    console.log(`unknown event: ${event} ${JSON.stringify(event)}`)
            }
        }
    }

    getClients(args: { forceRefresh?: boolean }): Promise<TeamSpeakClient[]> {
        return getClientsQuery(args, this.wretch)
    }

}
