export const config = {
    // how often to poll the teamspeak server for updates (events should always update immediately)
    idleTimeNoUserMs: 55 * 1000,
    idleTimeMainUserOnlineMs: 1 * 1000,
    idleTimeWithRandomUsers: 20 * 1000,
    idleTimeError: 10 * 1000,

    minIdleTimeMins: 5 // time when user is shown as idle/afk
}
