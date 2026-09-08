import type { StreamDeck } from "@elgato-stream-deck/node";
import { listStreamDecks, openStreamDeck } from "@elgato-stream-deck/node";
import { logger } from "~/utils/logger";
import { Store } from "~/utils/store";
import { getCornerButtonIndex } from "./controlLayout";
import { markShuttingDown } from "./shutdown";
import { paintStatusScreen } from "./status";

const deckStore = new Store<StreamDeck>();

export const getStreamdeck = (): Promise<StreamDeck> =>
  deckStore.fetch(() => streamDeckConnect(), {
    staleMs: Number.POSITIVE_INFINITY,
  });

const streamDeckConnect = async () => {
  const [deck] = await listStreamDecks();
  if (!deck) throw new Error("No Streamdeck connected");
  const streamDeck = await openStreamDeck(deck.path);

  streamDeck.on("error", (error: unknown) => {
    logger.error(error);
    deckStore.invalidate();
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
  const restartIndex = getCornerButtonIndex(streamDeck, "bottom-right");
  if (restartIndex === undefined) return;

  streamDeck.on("down", async (control) => {
    if (control.type !== "button" || control.index !== restartIndex) return;
    logger.warn(
      "restart button pressed, exiting so systemd restarts the service",
    );
    // set before any await: the main loop keeps running concurrently and
    // would otherwise repaint over the "restart" tile mid-shutdown
    markShuttingDown();
    // let the user see it's actually doing something before the deck goes
    // dark for the ~10s it takes systemd to bring the process back up
    await paintStatusScreen(streamDeck, "restart", "orange");
    process.exit(1);
  });
};
