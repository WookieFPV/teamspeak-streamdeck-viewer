import {openStreamDeck, listStreamDecks, StreamDeck,} from '@elgato-stream-deck/node'
import {TeamSpeak, TeamSpeakClient} from "ts3-nodejs-library";
import path from 'path'
import sharp from 'sharp'
import {tsConnect} from "./ts-base";
import {wait} from "./helper";

const colors = {
  black: "black",
  blue: "blue",
  light_blue: "light_blue",
  red: "red",
  orange: "orange"
} as const

type Colors = keyof typeof colors

const finalBufferOffline = () => sharp(path.resolve(__dirname, `assets/black.png`))
  .composite([
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" version="1.1">/
                        <text
                            font-family="'sans-serif'"
                            font-size="20px"
							font-weight="bold"
                            x="40"
                            y="50"
                            fill="#fff"
                            text-anchor="middle"
							stroke="#666"
                            ></text>
                    </svg>`
      ),
      top: 0,
      left: 0,
    },
  ])
  .flatten()
  .raw()
  .toBuffer()

const paint = async (streamDeck: StreamDeck, index: number, name: string, color: Colors) => {
  try {
    const finalBuffer = await sharp(path.resolve(__dirname, `assets/${color}.png`))
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${streamDeck.ICON_SIZE} ${
              streamDeck.ICON_SIZE
            }" version="1.1">/
                        <text
                            font-family="'sans-serif'"
                            font-size="20px"
							font-weight="bold"
                            x="40"
                            y="50"
                            fill="#fff"
                            text-anchor="middle"
							stroke="#666"
                            >${name}</text>
                    </svg>`
          ),
          top: 0,
          left: 0,
        },
      ])
      .flatten()
      .raw()
      .toBuffer()
    await streamDeck.fillKeyBuffer(index, finalBuffer, {format: 'rgba'})
  } catch (error) {
    console.error(error)
  }
}

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

export const clientStateToColor = (client: TeamSpeakClient): Colors => {
 if (client.flagTalking) {
    return "light_blue"
  } else if (client.inputMuted && !client.outputMuted) {
    return "orange"
  } else if (client.outputMuted) {
    return "red"
  } else {
    return "blue"
  }
}

const drawTS = async (streamDeck: StreamDeck, ts: TeamSpeak) => {
  const clientsRaw = await ts.clientList();
  const clients = clientsRaw.filter(c => c.type == 0)


  const clientList = clients.map(f => f.nickname)
  console.log("clients:" + JSON.stringify(clientList))


  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    await paint(streamDeck, i, client.nickname, clientStateToColor(client))
  }
  for (let i = clients.length; i < 6; i++) {
    await streamDeck.clearKey(i)
  }
}

const run = async () => {
  const streamDeck = await fun()

  for (let i = 0; i < 6; i++) {
    await streamDeck.clearKey(i)
  }


  const ts = await tsConnect()

  while (true) {
    await drawTS(streamDeck,ts)
    await wait(500);
  }

}


run()
