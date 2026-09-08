import path from "node:path";
import type { StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { envVars } from "~/envVars";
import { logger } from "~/utils/logger";
import type { Colors } from "./colors";
import { buildClockSvg, buildKeySvg, type FontSettings } from "./renderer";

const fontSettings = (): FontSettings => ({
  family: envVars.STREAMDECK_FONT,
  userSizePx: envVars.STREAMDECK_USER_FONTSIZE,
  afkSizePx: envVars.STREAMDECK_AFK_FONTSIZE,
});

export const buttonIndices = (streamDeck: StreamDeck): number[] =>
  streamDeck.CONTROLS.filter((c) => c.type === "button")
    .map((c) => c.index)
    .sort((a, b) => a - b);

export const buttonCount = (streamDeck: StreamDeck): number =>
  streamDeck.CONTROLS.filter((c) => c.type === "button").length;

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

const paintSvg = async (
  streamDeck: StreamDeck,
  index: number,
  background: Colors,
  svg: string,
) => {
  try {
    const finalBuffer = await sharp(
      path.resolve(process.cwd(), "assets", `${background}.png`),
    )
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .flatten()
      .raw()
      .toBuffer();
    await streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
  } catch (error) {
    logger.error(error);
  }
};

/** generic labeled tile (status messages, boot steps, errors, ...) */
export const paintKey = async (
  streamDeck: StreamDeck,
  index: number,
  opts: { label: string; color: Colors; subText?: string },
) =>
  paintSvg(
    streamDeck,
    index,
    opts.color,
    buildKeySvg({
      name: opts.label,
      subText: opts.subText ?? "",
      pixelSize: keyPixelSize(streamDeck, index),
      fonts: fontSettings(),
    }),
  );

/** one client tile; the color follows the client's state (see colors.ts) */
export const paintClientKey = async (
  streamDeck: StreamDeck,
  index: number,
  opts: { name: string; color: Colors; afkText: string },
) =>
  paintSvg(
    streamDeck,
    index,
    opts.color,
    buildKeySvg({
      name: opts.name,
      subText: opts.afkText,
      pixelSize: keyPixelSize(streamDeck, index),
      fonts: fontSettings(),
    }),
  );

export const clearKeys = async (
  streamDeck: StreamDeck,
  indices: readonly number[],
) => {
  for (const index of indices) {
    await streamDeck.clearKey(index);
  }
};

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
  const fonts = fontSettings();
  return paintSvg(
    streamDeck,
    index,
    "black",
    buildClockSvg({
      char,
      pixelSize: keyPixelSize(streamDeck, index),
      family: fonts.family,
    }),
  );
};
