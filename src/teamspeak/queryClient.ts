import { QueryClient } from "@tanstack/query-core";

export const queryClient = new QueryClient();

export const queryKey = {
	streamDeck: ["streamDeck"],
	clients: ["clients"],
	channels: ["channels"],
	tsInstance: ["tsInstance"],
};
