import {openStreamDeck, listStreamDecks, } from '@elgato-stream-deck/node'


const fun = async () => {
  const [deck] = await listStreamDecks()

  const myStreamDeck = await openStreamDeck(deck.path)
  myStreamDeck.on('down', async (keyIndex: number) => {
    console.log('key %d down', keyIndex)
    await myStreamDeck.fillKeyColor(keyIndex, 0, 255, 0)
  })

  myStreamDeck.on('up', async (keyIndex: number) => {
    console.log('key %d up', keyIndex)
    await myStreamDeck.fillKeyColor(keyIndex, 255, 0, 0)
  })

// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.
  myStreamDeck.on('error', (error: unknown) => {
    console.error(error)
  })

// Fill the first button form the left in the first row with a solid red color. This is asynchronous.
  await myStreamDeck.fillKeyColor(4, 255, 0, 0)
  console.log('Successfully wrote a red square to key 4.')

}


fun()
