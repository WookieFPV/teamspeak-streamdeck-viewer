import {openStreamDeck, listStreamDecks, } from '@elgato-stream-deck/node'
import sharp from 'sharp'

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

    try {
      const finalBuffer = await sharp(require("./assets/vogel.png"))
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
                            x="${streamDeck.ICON_SIZE / 3}"
                            y="${streamDeck.ICON_SIZE - 5}"
                            fill="#fff"
                            text-anchor="middle"
							stroke="#666"
                            >Wookie</text>
                    </svg>`
            ),
            top: 0,
            left: 0,
          },
        ])
        .flatten()
        .raw()
        .toBuffer()
      await streamDeck.fillKeyBuffer(keyIndex, finalBuffer, { format: 'rgba' })
    } catch (error) {
      console.error(error)
    }
  })

// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.
  streamDeck.on('error', (error: unknown) => {
    console.error(error)
  })

// Fill the first button form the left in the first row with a solid red color. This is asynchronous.
  await streamDeck.fillKeyColor(4, 255, 0, 0)
  console.log('Successfully wrote a red square to key 4.')

}


fun()
