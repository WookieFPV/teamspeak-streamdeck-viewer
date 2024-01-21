import {openStreamDeck, listStreamDecks, StreamDeck,} from '@elgato-stream-deck/node'
import {TeamSpeak, TeamSpeakClient} from "ts3-nodejs-library";
import {tsConnect} from "./ts-base";
import {wait} from "./helper";
import {paint} from "./streamdeck";

import {clientStateToColor, getName} from "./assets/tsHelper";

const clientOnDeck = new Array<TeamSpeakClient | undefined>(6)

const fun = async () => {
  const [deck] = await listStreamDecks()

  const streamDeck = await openStreamDeck(deck.path)

  console.log(JSON.stringify(streamDeck))
  streamDeck.on('down', async (keyIndex: number) => {
    console.log('key %d down', keyIndex)
    //await streamDeck.fillKeyColor(keyIndex, 0, 255, 0)
  })

  streamDeck.on('up', async (keyIndex: number) => {
    console.log('key %d up', keyIndex)
    //await streamDeck.fillKeyColor(keyIndex, 255, 0, 0)
  })

// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.
  streamDeck.on('error', (error: unknown) => {
    console.error(error)
  })

  return streamDeck
}

const drawTS = async (streamDeck: StreamDeck, ts: TeamSpeak) => {
  const clientsRaw = await ts.clientList();
  const wookie = clientsRaw.find(client => client.nickname.includes("Wookie"))
  const clients = clientsRaw.filter(c => c.type == 0).filter((c => !wookie || c.cid === wookie?.cid))

  const clientNames = clients.map(f => f.nickname)

  for (let i = 0; i < clients.length; i++) {
    if (i >= 6) continue
    const client = clients[i]
    const subText = Math.floor(client.idleTime / 1000 / 60)


    clientOnDeck[i] = client
    await paint(streamDeck, i, getName(client), clientStateToColor(client), subText)

  }
  for (let i = clients.length; i < 6; i++) {
    await streamDeck.clearKey(i)
  }

  if (clientNames.length === 0) {
    console.log("no one online, sleep some time...")
    await wait(10 * 1000)
  } else if (!clients.find((client) => client.nickname === "Wookie")) {
    console.log("no wookie, sleep some time...")
    await wait(5 * 1000)
  }

}

const run = async () => {
  const streamDeck = await fun()

  for (let i = 0; i < 6; i++) {
    await streamDeck.clearKey(i)
  }


  const ts = await tsConnect()

  streamDeck.on('down', async (keyIndex: number) => {
    console.log('key %d down', keyIndex)

    const cl = clientOnDeck[keyIndex]
    if (cl) {
      await ts.clientPoke(cl, "hello from se Streamdeck")
    }
  })

  while (true) {
    await drawTS(streamDeck, ts)
    await wait(500);
  }

}


run()

