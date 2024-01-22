import { TeamSpeakClient } from "ts3-nodejs-library";
import { tsConnect } from "./teamspeak/ts-base";
import { wait, waitForNetwork } from "./helper";
import { streamDeckConnect } from "./streamdeck";
import { TsDrawClients } from "./teamspeak/tsPrintClients";
import { envVars } from "./envVars";

export const staticData = {
  clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
  prevCid: ""
}

const run = async () => {
  console.log("started")
  const streamDeck = await streamDeckConnect()
  await streamDeck.clearPanel()
 if(envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 0, 0, 100)

  await waitForNetwork()

  const ts = await tsConnect().catch(async () => {
    if(envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 100, 0, 0)
    throw ts
  })
  if(envVars.DEBUG_UI) await streamDeck.fillKeyColor(0, 0, 100, 0)

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

  while (true) {
    await TsDrawClients(streamDeck, ts)
    await wait(500);
  }
}

run()
