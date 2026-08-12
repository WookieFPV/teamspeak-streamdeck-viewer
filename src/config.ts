export const config = {
  // how often to poll the teamspeak server for updates (events should always update immediately)
  idleTimeNoUserMs: 5 * 1000,
  idleTimeMainUserOnlineMs: 1 * 1000,
  idleTimeWithRandomUsers: 5 * 1000,
  idleTimeError: 10 * 1000,

  minIdleTimeMins: 5, // time when user is shown as idle/afk

  // the clock occupies the last row of keys (hours, ":", minutes)
  clockKeyCount: 3,
  // only show the clock while at most this many clients are on the deck
  maxClientsWithClock: 3,
};
