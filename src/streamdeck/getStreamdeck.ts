import type { StreamDeck } from "@elgato-stream-deck/node";
import { listStreamDecks, openStreamDeck } from "@elgato-stream-deck/node";
import { envVars } from "~/envVars";
import { wait } from "~/utils/helper";
import { logger } from "~/utils/logger";
import { Store } from "~/utils/store";
import { getCornerButtonIndex } from "./controlLayout";
import { invalidatePaintCaches } from "./deck";
import { markShuttingDown } from "./shutdown";
import { paintStatusScreen } from "./status";

const RETRY_DELAY_MS = 5 * 1000;

const deckStore = new Store<StreamDeck>();

export const getStreamdeck = (): Promise<StreamDeck> =>
  deckStore.fetch(() => streamDeckConnect(), {
    staleMs: Number.POSITIVE_INFINITY,
  });

/**
 * Keeps retrying until a deck is open. The old code threw on the first miss,
 * so an unplugged-at-boot (or mid-run USB drop, via the `error` handler
 * below invalidating the cached device) killed the process / wedged the loop.
 * There is nothing useful to do without the display, so wait here instead.
 */
const streamDeckConnect = async (): Promise<StreamDeck> => {
  for (;;) {
    try {
      return await tryConnectOnce();
    } catch (error) {
      logger.warn(`streamdeck not available, retrying in 5s: ${String(error)}`);
      await wait(RETRY_DELAY_MS);
    }
  }
};

const tryConnectOnce = async (): Promise<StreamDeck> => {
  const decks = await listStreamDecks();
  if (decks.length === 0) throw new Error("listStreamDecks() found nothing");

  const selector = envVars.STREAMDECK_PATH;
  const deck = selector ? decks.find((d) => d.path === selector) : decks[0];
  if (!deck) {
    throw new Error(
      selector
        ? `no deck matches STREAMDECK_PATH="${selector}" (found: ${decks.map((d) => d.path).join(", ")})`
        : "listStreamDecks() found nothing",
    );
  }
  if (decks.length > 1 && !selector) {
    logger.warn(
      `found ${decks.length} decks, using the first (${deck.path}) - set STREAMDECK_PATH to pin one`,
    );
  }
  logger.info(`opening streamdeck at ${deck.path}`);

  const streamDeck = await openStreamDeck(deck.path);

  streamDeck.on("error", (error: unknown) => {
    logger.warn(`streamdeck error, dropping cached device: ${String(error)}`);
    // the next getStreamdeck() re-enters the retry loop above and blocks
    // until the device is back - callers (TsDrawClients) just await it
    deckStore.invalidate();
  });

  // a (re)connected device is blank and the diff cache still describes
  // whatever the previous device showed - repaint everything
  invalidatePaintCaches();

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
