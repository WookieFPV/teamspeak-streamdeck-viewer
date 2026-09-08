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
};
