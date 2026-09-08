import type { StreamDeck } from "@elgato-stream-deck/node";
import { listStreamDecks, openStreamDeck } from "@elgato-stream-deck/node";
import { queryClient, queryKey } from "~/teamspeak/queryClient";
import { logger } from "~/utils/logger";

export const getStreamdeck = () =>
  queryClient.fetchQuery({
    queryKey: queryKey.streamDeck,
    queryFn: () => streamDeckConnect(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

const streamDeckConnect = async () => {
  const [deck] = await listStreamDecks();
  if (!deck) throw new Error("No Streamdeck connected");
  const streamDeck = await openStreamDeck(deck.path);

  streamDeck.on("error", (error: unknown) => {
    logger.error(error);
    queryClient.removeQueries({ queryKey: queryKey.streamDeck });
  });

  registerRestartButton(streamDeck);

  return streamDeck;
};

// The stream deck occasionally shows stale client data (root cause unknown -
// could be a wedged TS3 connection, a half-open websocket, or the HID device
// itself). Rather than diagnosing every possible cause, the bottom-right key
// just exits the process: systemd (Restart=always, see deploy/) brings it
// back up within ~10s with a fresh connection to everything.
const registerRestartButton = (streamDeck: StreamDeck) => {
  const buttons = streamDeck.CONTROLS.filter((c) => c.type === "button");
  if (buttons.length === 0) return;

  const maxRow = Math.max(...buttons.map((c) => c.row));
  const bottomRow = buttons.filter((c) => c.row === maxRow);
  const maxColumn = Math.max(...bottomRow.map((c) => c.column));
  const restartButton = bottomRow.find((c) => c.column === maxColumn);
  if (!restartButton) return;

  streamDeck.on("down", (control) => {
    if (control.type !== "button" || control.index !== restartButton.index)
      return;
    logger.warn(
      "restart button pressed, exiting so systemd restarts the service",
    );
    process.exit(1);
  });
};
