import {openStreamDeck, listStreamDecks, StreamDeck,} from '@elgato-stream-deck/node'
import path from 'path'
import sharp from 'sharp'

const colors = {
  black: "black",
  blue: "blue",
  light_blue: "light_blue",
  red: "red",
  none: "none"
} as const

type Colors = keyof typeof colors

const finalBufferOffline = ()=> sharp(path.resolve(__dirname, `assets/black.png`))
  .composite( [
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
    const finalBuffer = color === "none"? await finalBufferOffline() : await sharp(path.resolve(__dirname, `assets/${color}.png`))
      .composite(  [
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


const run = async () => {
  const streamDeck = await fun()

  await paint(streamDeck, 0, "wookie", "red")
  await paint(streamDeck, 1, "N1m4", "blue")
  await paint(streamDeck, 2, "jonas", "light_blue")
  await paint(streamDeck, 3, "felix", "none")
  await paint(streamDeck, 4, "luki", "red")
  await paint(streamDeck, 5, "Peter", "red")
}


run()
