# Deployment

The app is a long-running process; on the production device it is managed by systemd.

`streamdeck-ts-viewer.service` assumes the checkout lives in `/home/pi/streamdeck-ts-viewer`, runs
as user `pi`, and finds node 18 under `/home/pi/.nvm/versions/node/v18.19.0/bin`. Adjust
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
sudo systemctl restart streamdeck-ts-viewer   # after a `pnpm build`
sudo systemctl status streamdeck-ts-viewer
tail -f ~/streamdeck.log                      # the app's own log (truncated on each start)
journalctl -u streamdeck-ts-viewer            # only start/stop/crash noise
```

`dist/` is not in git, so a deployment is `git pull && pnpm install --frozen-lockfile && pnpm build`
followed by a restart.
