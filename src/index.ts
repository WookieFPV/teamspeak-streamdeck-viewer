import {wait, waitForNetwork} from "./helper";
import {streamDeckConnect} from "./streamdeck";
import {TsDrawClients} from "./teamspeak/tsDrawClients";
import {envVars} from "./envVars";
import {getPollingDelay} from "./teamspeak/tsHelper";
import {TeamSpeakClient} from "./teamspeak/teamspeakTypes";
import WebSocket from "ws"
import {TsWsEvent} from "./teamspeak/WsEvent";
import {config} from "./config";

export const staticData = {
    clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
    prevCid: ""
}

const run = async () => {
    console.log("started")
    const streamDeck = await streamDeckConnect()
    await streamDeck.clearPanel()
    if (envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 0, 0, 100)

    await waitForNetwork()

    if (envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 0, 100, 0)

    const socket = new WebSocket(envVars.BACKEND_WS_URL, {headers: {Authorization: `Bearer ${envVars.BACKEND_TOKEN}`}});

    socket.onopen = function () {
        console.log("[WS] Connected");
    };

    socket.onerror = (error) => {
        console.log("onerror")
        console.log(error)
    }
    socket.onmessage = function (_event) {
        if (typeof _event.data !== "string") return console.log(`Invalid ws event (must be obj) not ${_event.data}`)

        const event = JSON.parse(_event.data) as TsWsEvent
        switch (event.type) {
            case "clientConnect":
                console.log(`client connect: ${event.e.client.clientNickname}`)
                TsDrawClients(streamDeck, true).catch(console.warn)
                break
            case "clientDisconnect":
                console.log(`client disconnect: ${event.e.client?.clientNickname}`)
                TsDrawClients(streamDeck, true).catch(console.warn)
                break
            case "clientMoved":
                console.log(`client moved: ${event.e.client?.clientNickname} [${event.e.channel.channelName}]`)
                TsDrawClients(streamDeck, true).catch(console.warn)
                break
            case "connected":
                console.log(`connected`)
                break
            default:
                console.log(`unknown event: ${event} ${JSON.stringify(event)}`)
        }
    };

    while (true) {
        try {
            const clients = await TsDrawClients(streamDeck)
            await wait(getPollingDelay(clients))
        } catch (err) {
            console.warn(err)
            await wait(config.idleTimeError)
        }
    }
}

run()
