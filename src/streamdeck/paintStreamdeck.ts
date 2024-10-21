import path from "node:path";
import type { StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { config } from "~/config";
import { envVars } from "~/envVars";
import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";
import { getName } from "~/teamspeak/tsHelper";
import { logger } from "~/utils/logger";
import { type Colors, clientStateToColor } from "./colors";

export const streamDeckPaintTs = async (
  streamDeck: StreamDeck,
  client: TeamSpeakClient,
  i: number,
  idleTime: number,
  mainUser?: TeamSpeakClient,
) => {
  const afkText = idleTime >= config.minIdleTimeMins ? `${idleTime}m` : "";
  return streamDeckPaint(
    streamDeck,
    i,
    getName(client),
    clientStateToColor(client, mainUser),
    afkText,
  );
};

const fontSettings = {
  user: {
    family: envVars.STREAMDECK_FONT ?? "sans-serif",
    size: envVars.STREAMDECK_USER_FONTSIZE ?? "18px",
  },
  afk: {
    family: envVars.STREAMDECK_FONT ?? "sans-serif",
    size: envVars.STREAMDECK_AFK_FONTSIZE ?? "14px",
  },
};

export const streamDeckPaint = async (
  streamDeck: StreamDeck,
  index: number,
  name: string,
  color: Colors,
  subText: string,
) => {
  try {
    const finalBuffer = await sharp(
      path.resolve(__dirname, `../assets/${color}.png`),
    )
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${streamDeck.ICON_SIZE} ${streamDeck.ICON_SIZE}">
              <text
                font-family="${fontSettings.user.family}"
                font-size="${fontSettings.user.size}"
                font-weight="bold"
                x="40"
                y="40"
                fill="#fff"
                text-anchor="middle"
              >${name}
              </text>
              <text
                font-family="${fontSettings.afk.family}"
                font-size="${fontSettings.afk.size}"
                x="40"
                y="60"
                fill="#fff"
                text-anchor="middle"
              >${subText}
              </text>
            </svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .flatten()
      .raw()
      .toBuffer();
    await streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
  } catch (error) {
    logger.error(error);
  }
};
export const drawClock = async (streamDeck: StreamDeck) => {
  try {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");

    await renderChar(streamDeck, hours, 0);
    await renderChar(streamDeck, ":", 1);
    await renderChar(streamDeck, mins, 2);
  } catch (error) {
    logger.error(error);
  }
};

const renderChar = async (
  streamDeck: StreamDeck,
  char: string,
  index: number,
) => {
  const finalBuffer = await sharp(
    path.resolve(__dirname, "../assets/black.png"),
  )
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${streamDeck.ICON_SIZE} ${streamDeck.ICON_SIZE}">
              <text
                font-family="${fontSettings.user.family}"
                font-size="50px"
                font-weight="bold"
                dx="50%"
                dy="75%"
                fill="#fff"
                text-anchor="middle"
              >${char}
              </text>
            </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .flatten()
    .raw()
    .toBuffer();
  return streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
};
