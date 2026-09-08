import type { StreamDeck } from "@elgato-stream-deck/node";
import { config } from "~/config";
import type { Colors } from "./colors";
import { getCornerButtonIndex } from "./controlLayout";
import {
  buttonIndices,
  clearKeys,
  drawClock,
  invalidatePaintCaches,
  paintKey,
} from "./deck";

/**
 * Shows a single-tile status message (top-left) instead of client data, for
 * the two situations where there is no trustworthy client list to draw: still
 * booting/connecting, or the last fetch failed. The clock keeps its usual
 * spot next to it since it doesn't depend on backend data; every other key
 * is cleared rather than left showing whatever client data was there before.
 */
export const paintStatusScreen = async (
  streamDeck: StreamDeck,
  label: string,
  color: Colors,
  subText = "",
) => {
  // the status tile + clears overwrite keys whose content the diff cache still
  // describes as client data - drop it so the next client paint isn't skipped
  invalidatePaintCaches();

  const buttons = buttonIndices(streamDeck);
  const statusIndex = getCornerButtonIndex(streamDeck, "top-left");
  if (statusIndex === undefined) return;

  await paintKey(streamDeck, statusIndex, { label, color, subText });

  const clockKeys = buttons.slice(-config.clockKeyCount);
  const [clockKey1, clockKey2, clockKey3] = clockKeys;

  await clearKeys(
    streamDeck,
    buttons.filter(
      (index) => index !== statusIndex && !clockKeys.includes(index),
    ),
  );

  if (
    clockKey1 !== undefined &&
    clockKey2 !== undefined &&
    clockKey3 !== undefined &&
    clockKey1 !== statusIndex
  ) {
    await drawClock(streamDeck, [clockKey1, clockKey2, clockKey3]);
  }
};
