import type { StreamDeck } from "@elgato-stream-deck/node";
import { config } from "~/config";
import { getCornerButtonIndex } from "./controlLayout";
import { streamDeckPaint } from "./paintStreamdeck";

/** short labels only - these get squeezed onto an 80x80px key alongside every other one during startup */
export type StartupStatus = "starting" | "network" | "connecting" | "ready";

/** takes over every key to show startup progress. Only safe to call before
 * the main loop starts drawing clients - once real key content exists this
 * would overwrite it. */
export const paintStartupStatus = async (
  streamDeck: StreamDeck,
  status: StartupStatus,
) => {
  const buttons = streamDeck.CONTROLS.filter((c) => c.type === "button");
  await Promise.all(
    buttons.map((c) =>
      streamDeckPaint(streamDeck, c.index, status, "black", ""),
    ),
  );
};

let lastSuccessAt: number | undefined;

/** call once per successful client fetch+draw, from whichever backend/path triggered it */
export const markClientsDrawn = () => {
  lastSuccessAt = Date.now();
};

const isStale = (): boolean =>
  lastSuccessAt === undefined ||
  Date.now() - lastSuccessAt > config.statusStaleAfterMs;

/** repaints the small always-reserved top-left key: blue while data is
 * fresh, red once nothing has been fetched successfully in a while. */
export const paintStatusKey = async (streamDeck: StreamDeck) => {
  const index = getCornerButtonIndex(streamDeck, "top-left");
  if (index === undefined) return;
  await streamDeckPaint(streamDeck, index, "", isStale() ? "red" : "blue", "");
};
