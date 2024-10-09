import {queryClient, queryKey} from "../teamspeak/queryClient";
import {listStreamDecks, openStreamDeck} from "@elgato-stream-deck/node";

export const getStreamdeck = () => queryClient.fetchQuery({
    queryKey: queryKey.streamDeck,
    queryFn: () => streamDeckConnect(),
    staleTime: Infinity,
    gcTime: Infinity,
})

const streamDeckConnect = async () => {
    const [deck] = await listStreamDecks()
    if (!deck) throw new Error("No Streamdeck connected")
    const streamDeck = await openStreamDeck(deck.path)

    streamDeck.on('error', (error: unknown) => {
        console.error(error)
        queryClient.removeQueries({queryKey: queryKey.streamDeck})
    })
    return streamDeck
}
