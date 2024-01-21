import { listStreamDecks, openStreamDeck, StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import path from "path";
import { Colors } from "./types";
import { TeamSpeakClient } from "ts3-nodejs-library";
import { clientStateToColor, getName } from "./tsHelper";

export const streamDeckConnect = async () => {
  const [deck] = await listStreamDecks()
  const streamDeck = await openStreamDeck(deck.path)

  streamDeck.on('error', (error: unknown) => {
    console.error(error)
  })
  return streamDeck
}

export const streamDeckPaintTs = async (streamDeck: StreamDeck, client: TeamSpeakClient, i: number, idleTime: number) => {
  const afkText = idleTime >= 5 ? idleTime + "m" : "";
  return streamDeckPaint(streamDeck, i, getName(client), clientStateToColor(client), afkText)
}


export const streamDeckPaint = async (streamDeck: StreamDeck, index: number, name: string, color: Colors, subText = "") => {
  try {
    const finalBuffer = await sharp(path.resolve(__dirname, `../assets/${color}.png`))
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${streamDeck.ICON_SIZE} ${
              streamDeck.ICON_SIZE
            }">
                        <text
                            font-family="'sans-serif'"
                            font-size="20px"
							              font-weight="bold"
                            x="40"
                            y="40"
                            fill="#fff"
                            text-anchor="middle"
                            >${name}</text>
                            <text
                            font-family="'sans-serif'"
                            font-size="14px"
                            x="40"
                            y="60"
                            fill="#fff"
                            text-anchor="middle"
                            >${subText}</text>
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
