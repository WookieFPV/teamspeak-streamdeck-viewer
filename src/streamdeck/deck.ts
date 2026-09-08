import { promises as fs } from "node:fs";
import type { StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { envVars } from "~/envVars";
import { logger } from "~/utils/logger";
import { assetPath } from "./assets";
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
): Promise<boolean> => {
  try {
    const finalBuffer = await sharp(await getBackgroundBuffer(background))
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      // ensureAlpha (not flatten): fillKeyBuffer with { format: "rgba" }
      // needs 4 channels per pixel, flatten would drop alpha down to 3.
      .ensureAlpha()
      .raw()
      .toBuffer();
    await streamDeck.fillKeyBuffer(index, finalBuffer, { format: "rgba" });
    return true;
  } catch (error) {
    logger.error(error);
    // false so the diff cache doesn't treat a failed paint as up to date and
    // skip the key forever
    return false;
  }
};

/**
 * Background PNGs, read once and reused. The 1s poll loop used to re-read
 * (and sharp-decode) up to 6 backgrounds per tick on a Pi Zero 2W; now each
 * file is read from disk once per process and sharp decodes from memory.
 */
const backgroundCache = new Map<Colors, Promise<Buffer>>();

export const getBackgroundBuffer = (color: Colors): Promise<Buffer> => {
  const cached = backgroundCache.get(color);
  if (cached) return cached;
  const loaded = fs
    .readFile(assetPath(`${color}.png`))
    .catch((error: unknown) => {
      backgroundCache.delete(color);
      throw new Error(
        `cannot read background "${color}.png" (assets dir "${assetPath("")}"): ` +
          `start from the repo root or set STREAMDECK_ASSETS_DIR (${String(error)})`,
      );
    });
  backgroundCache.set(color, loaded);
  return loaded;
};

/**
 * Per-key content hashes. The poll loop repaints every 1s while the main user
 * is online, but keys almost never change (idle minutes tick, talking flags
 * flip). Each skipped key saves a sharp composite + HID fill on a Pi Zero 2W.
 * The hash covers everything visible on the key, so equal hash == equal image.
 */
const keyContentHash = new Map<number, string>();

export const isKeyUpToDate = (index: number, hash: string): boolean =>
  keyContentHash.get(index) === hash;

export const markKeyPainted = (index: number, hash: string): void => {
  keyContentHash.set(index, hash);
};

/** Fresh device (reconnect) or foreign content (status screen) invalidates everything. */
export const invalidatePaintCaches = (): void => {
  keyContentHash.clear();
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
  await Promise.all(indices.map((index) => streamDeck.clearKey(index)));
};

export const drawClock = async (
  streamDeck: StreamDeck,
  keyIndices: readonly [number, number, number],
) => {
  try {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");

    await Promise.all([
      renderChar(streamDeck, hours, keyIndices[0]),
      renderChar(streamDeck, ":", keyIndices[1]),
      renderChar(streamDeck, mins, keyIndices[2]),
    ]);
  } catch (error) {
    logger.error(error);
  }
};

const renderChar = async (
  streamDeck: StreamDeck,
  char: string,
  index: number,
): Promise<void> => {
  // hours/minutes only change once a minute and ":" never does - without this
  // the 1s loop re-composites the clock 60x per visible minute change
  const hash = `clock:${char}`;
  if (isKeyUpToDate(index, hash)) return;
  const fonts = fontSettings();
  const ok = await paintSvg(
    streamDeck,
    index,
    "black",
    buildClockSvg({
      char,
      pixelSize: keyPixelSize(streamDeck, index),
      family: fonts.family,
    }),
  );
  if (ok) markKeyPainted(index, hash);
};
