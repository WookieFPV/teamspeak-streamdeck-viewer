# Deployment

The app is a long-running process; on the production device it is managed by systemd.

`streamdeck-ts-viewer.service` assumes the checkout lives in `/home/pi/streamdeck-ts-viewer`, runs
as user `pi`, and finds bun under `/home/pi/.bun/bin`. Adjust
`User`/`Group`/`WorkingDirectory`/`Environment=PATH` if your device differs.

## Install

```sh
sudo cp deploy/streamdeck-ts-viewer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now streamdeck-ts-viewer
```

If the app was previously started from a `@reboot` crontab entry, remove that line — otherwise both
would start a copy after a reboot and the second one fails to claim the Stream Deck.

## Day to day

```sh
sudo systemctl restart streamdeck-ts-viewer   # after a `bun run build`
sudo systemctl status streamdeck-ts-viewer
tail -f ~/streamdeck.log                      # the app's own log (appended, not truncated)
journalctl -u streamdeck-ts-viewer            # stdout mirror + start/stop/crash noise
```

Logs: stdout is appended to `~/streamdeck.log` (rotation of that file is
journald's/stdout's problem - `logrotate` it if the pi's disk cares) and the
app additionally writes a self-rotating file via winston
(`src/utils/logger.ts`, `streamdeck.log` + 5x 1MB in the working directory,
override with `LOG_FILE`). Either way history now survives restarts - the old
`>` redirect truncated the log on every start.

`dist/` is not in git, so a deployment is `git pull && bun install --frozen-lockfile && bun run build`
followed by a restart.
