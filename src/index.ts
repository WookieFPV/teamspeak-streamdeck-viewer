import { TeamSpeakClient } from "ts3-nodejs-library";
import { tsConnect } from "./teamspeak/ts-base";
import { wait, waitForNetwork } from "./helper";
import { drawClock, streamDeckConnect } from "./streamdeck";
import { TsDrawClients } from "./teamspeak/tsPrintClients";
import { envVars } from "./envVars";
import { isMainUser } from "./teamspeak/tsHelper";

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

  const ts = await tsConnect().catch(async () => {
    if (envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 100, 0, 0)
    throw ts
  })
  if (envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 0, 100, 0)

  streamDeck.on('down', async (keyIndex: number) => {
    const cl = staticData.clientOnDeck[keyIndex]
    if (!cl) return
    const [JailCid] = await ts.channelFind("Wookbots Homebase")
    if (!JailCid) return
    staticData.prevCid = cl.cid
    await ts.clientMove(cl, JailCid.cid)
  })

  streamDeck.on('up', async (keyIndex: number) => {
    const cl = staticData.clientOnDeck[keyIndex]
    if (!cl) return
    await ts.clientMove(cl, staticData.prevCid)
  })

  ts.on("clientconnect", ({client}) => {
    console.log(`client connect: ${client.nickname}`)
    TsDrawClients(streamDeck, ts)
  })
  ts.on("clientdisconnect", ({client}) => {
    console.log(`client disconnect: ${client?.nickname}`)
    TsDrawClients(streamDeck, ts)
  })
  ts.on("clientmoved", ({client}) => {
    console.log(`client moved: ${client.nickname}`)
    TsDrawClients(streamDeck, ts)
  })

  while (true) {
    const clients = await TsDrawClients(streamDeck, ts)

    if (clients.length === 0) {
      console.log("no one online: sleep some time...")
      await drawClock(streamDeck)
      await wait(30 * 1000)
    } else if (clients.find(isMainUser)) {
      await wait(1000);
    } else {
      await wait(60 * 1000);
    }

  }
}

run()
