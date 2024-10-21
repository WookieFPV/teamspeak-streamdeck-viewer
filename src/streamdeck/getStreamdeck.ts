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
  return streamDeck;
};
