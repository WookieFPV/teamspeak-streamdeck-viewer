import { TeamSpeakClient } from "ts3-nodejs-library";
import { tsConnect } from "./teamspeak/ts-base";
import { wait } from "./helper";
import { streamDeckConnect } from "./streamdeck";
import { TsDrawClients } from "./teamspeak/tsPrintClients";


export const staticData = {
  clientOnDeck: new Array<TeamSpeakClient | undefined>(6),
  prevCid: ""
}

const run = async () => {
  console.log("started")
  const streamDeck = await streamDeckConnect()
  await streamDeck.clearPanel()

  console.log("ts connect...")
  const ts = await tsConnect()
  console.log("ts Connected")

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
