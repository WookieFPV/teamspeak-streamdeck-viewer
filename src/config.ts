export const config = {
  // how often to poll the teamspeak server for updates (events should always update immediately)
  idleTimeNoUserMs: 5 * 1000,
  idleTimeMainUserOnlineMs: 1 * 1000,
  idleTimeWithRandomUsers: 5 * 1000,
  idleTimeError: 10 * 1000,

  minIdleTimeMins: 5, // time when user is shown as idle/afk

  // websocket handling of the customApi backend
  ws: {
    reconnectMinDelayMs: 5 * 1000,
    reconnectMaxDelayMs: 60 * 1000,
    // how often the connection is checked for silence
    watchdogIntervalMs: 10 * 1000,
    // the api server sends a heartbeat every 30s, allow 2.5 of them to be lost
    // before treating the connection as dead (half open tcp, sleeping wifi, ...)
    staleAfterMs: 75 * 1000,
  },

  // the clock occupies the last row of keys (hours, ":", minutes)
  clockKeyCount: 3,
  // only show the clock while at most this many clients are on the deck
  maxClientsWithClock: 3,

  // how long the top-left status key can go without a successful client
  // fetch before it flips from "ok" to "stale". A real broken connection
  // surfaces as thrown errors (see the main loop's catch block), which is
  // much faster than this - this threshold is just a backstop so the key
  // doesn't flicker red on a single slow poll.
  statusStaleAfterMs: 30 * 1000,
};
