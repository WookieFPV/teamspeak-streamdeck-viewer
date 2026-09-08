import path from "node:path";
import type { StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { config } from "~/config";
import { envVars } from "~/envVars";
import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";
import { getName } from "~/teamspeak/tsHelper";
import { logger } from "~/utils/logger";
import { type Colors, clientStateToColor } from "./colors";

// elgato-stream-deck v7 removed ICON_SIZE; the per-key resolution now lives
// on the button control definitions
const keyPixelSize = (streamDeck: StreamDeck, index: number): number => {
  const control = streamDeck.CONTROLS.find(
    (c) => c.type === "button" && c.index === index,
  );
  if (control?.type !== "button" || control.feedbackType !== "lcd") {
    throw new Error(`key ${index} does not support image fills`);
  }
  return control.pixelSize.width;
};

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
    const size = keyPixelSize(streamDeck, index);
    const finalBuffer = await sharp(
      path.resolve(process.cwd(), "assets", `${color}.png`),
    )
      .composite([
        {
          input: Buffer.from(
            // coordinates are relative to the key resolution: the old
            // hardcoded x=40/y=40/y=60 only fit an 80px key. Text is XML-
            // escaped because nicknames may contain &<>"' which would
            // otherwise break the SVG (or leak markup into the render).
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
              <text
                font-family="${fontSettings.user.family}"
                font-size="${fontSettings.user.size}"
                font-weight="bold"
                x="${size / 2}"
                y="${size * 0.5}"
                fill="#fff"
                text-anchor="middle"
              >${escapeXml(name)}
              </text>
              <text
                font-family="${fontSettings.afk.family}"
                font-size="${fontSettings.afk.size}"
                x="${size / 2}"
                y="${size * 0.75}"
                fill="#fff"
                text-anchor="middle"
              >${escapeXml(subText)}
              </text>
            </svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      // ensureAlpha (not flatten): fillKeyBuffer with { format: "rgba" }
      // needs 4 channels per pixel, flatten would drop alpha down to 3.
      .ensureAlpha()
      .raw()
      .toBuffer();
    await streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
  } catch (error) {
    logger.error(error);
  }
};

/** minimal XML escaper for text interpolated into the key SVG */
export const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
export const drawClock = async (
  streamDeck: StreamDeck,
  keyIndices: readonly [number, number, number],
) => {
  try {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");

    await renderChar(streamDeck, hours, keyIndices[0]);
    await renderChar(streamDeck, ":", keyIndices[1]);
    await renderChar(streamDeck, mins, keyIndices[2]);
  } catch (error) {
    logger.error(error);
  }
};

const renderChar = async (
  streamDeck: StreamDeck,
  char: string,
  index: number,
) => {
  const size = keyPixelSize(streamDeck, index);
  const finalBuffer = await sharp(
    path.resolve(process.cwd(), "assets", "black.png"),
  )
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
              <text
                font-family="${fontSettings.user.family}"
                font-size="50px"
                font-weight="bold"
                dx="50%"
                dy="75%"
                fill="#fff"
                text-anchor="middle"
              >${escapeXml(char)}
              </text>
            </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .ensureAlpha()
    .raw()
    .toBuffer();
  return streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
};
