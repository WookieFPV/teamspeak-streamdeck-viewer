import {StreamDeck} from "@elgato-stream-deck/node";
import sharp from "sharp";
import path from "path";
import {Colors} from "./types";

export const paint = async (streamDeck: StreamDeck, index: number, name: string, color: Colors, subText = 0) => {
  try {
    const afkText = subText >= 5 ? subText + "m" : "";
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
                            >${afkText}</text>
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
