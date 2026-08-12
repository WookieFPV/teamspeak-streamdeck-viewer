# CLAUDE.md

Guide for AI assistants working on this repo. Host-specific deployment details (ssh target, paths)
are in `CLAUDE.local.md`, which is intentionally **not** committed — this repo is public.

## What this is

A long-running node process that displays TeamSpeak clients on an Elgato Stream Deck. It is not a
library and has no tests: it polls/subscribes to a TeamSpeak backend, then paints one key per
client. It runs 24/7 on a raspberry pi with a Stream Deck Mini attached.

## Toolchain constraints (read before upgrading anything)

The production device is a raspberry pi (armv7, ~427MB RAM) running **node 18**. That drives
everything:

- **bun does not work there.** A bun migration was tried and reverted. Stay on node + tsup.
- **pnpm is pinned to 10.x** via the `packageManager` field. pnpm 11 requires node >= 22.13 and
  crashes on node 18 with `TypeError: Invalid host defined options`.
- Build target is `node18` (`tsup.config.ts`), `engines.node` is `>=18.12`, `.nvmrc` is `18`.
- `ssh2` / `cpu-features` are deliberately left out of `pnpm.onlyBuiltDependencies`: optional native
  speedups that would need a node-gyp toolchain on the pi. The pure JS fallback is used.
- Native deps that must keep working on armv7: `sharp`, `node-hid`, `@julusian/jpeg-turbo`.

Check any dependency bump against node 18 on armv7 before proposing it.

## Commands

| command           | what it does                                        |
|-------------------|-----------------------------------------------------|
| `pnpm install`    | install (uses `pnpm-lock.yaml`)                     |
| `pnpm start`      | dev: tsup watch + nodemon restart                   |
| `pnpm build`      | bundle to `dist/index.js` (cjs, target node18)      |
| `pnpm start-prod` | `node dist/index.js` — what production runs         |
| `pnpm check`      | biome lint + format with autofix                    |
| `pnpm check-ci`   | `biome ci`, non-mutating (used by CI)               |
| `pnpm typecheck`  | `tsc --noEmit`                                      |

CI (`.github/workflows/ci.yml`) runs check-ci, typecheck and build on node 18.

## Structure

Entry point is `src/index.ts`: get the Stream Deck, wait for network, build a backend, then loop
forever — fetch clients, draw them, sleep for a backend-dependent delay, and swallow/log errors so
the process never dies.

- `src/envVars.ts` — all config comes from `.env` (loaded with dotenv) and is validated by a zod
  discriminated union on `BACKEND_TYPE`. Invalid env logs and throws at import time.
- `src/config.ts` — polling delays and the AFK threshold.
- `src/teamspeak/BackendFactory.ts` — picks the backend off `BACKEND_TYPE`. Both backends implement
  the `TsBackend` interface (`getClients`).
  - `backendTs3/` — `BACKEND_TYPE=ts3`, talks to the TeamSpeak server query API directly via
    `ts3-nodejs-library`. Needs `TS3_HOST` / `TS3_USERNAME` / `TS3_PASSWORD`.
  - `backendCustomApi/` — `BACKEND_TYPE=customApi`, talks to a separate HTTP + websocket service
    (`BACKEND_URL` / `BACKEND_WS_URL` / `BACKEND_TOKEN`); event-driven instead of polling. Its log
    lines are prefixed `[WS]`, the ts3 backend's are `[TS]` — handy for telling them apart in a log.
    Missing an event means showing stale clients, so the socket handling is defensive: a full
    refresh on every (re)connect and on the server's `tsReconnected` event, a watchdog that
    recycles the socket when the server's `heartbeat` stops arriving (half open tcp), and a
    single-flight reconnect with backoff guarded by a generation counter so two sockets can never
    run at once. Timings live in `config.ws`.
  - `queryClient.ts` — `@tanstack/query-core` cache shared by the backends.
  - `tsDrawClients.ts` / `tsHelper.ts` / `addLastActiveTime.ts` — turn a client list into what goes
    on the keys (ordering, idle time, polling delay).
- `src/streamdeck/` — `getStreamdeck.ts` opens the device, `paintStreamdeck.ts` composites an SVG
  text layer onto a background PNG with sharp and pushes the raw buffer to a key, `colors.ts` maps
  client state (talking, muted, afk, main user) to one of the PNGs in `assets/`.
- `src/utils/logger.ts` — winston. Everything logs through it, never `console.log`.

## Things that will bite you

- **`dist/` is not in git.** After pulling on the device you must `pnpm build` before restarting.
- **Asset paths are `dist`-relative.** `paintStreamdeck.ts` resolves `path.resolve(__dirname,
  "../assets/...")`, which only works because the bundle lands in `dist/`. Don't "fix" this to be
  src-relative, and note it breaks if the output ever moves or goes ESM.
- **dotenv reads `<cwd>/.env`**, so the working directory the process is started from matters.
- The main loop catches everything and keeps going, so failures show up as repeated log lines
  rather than a crash. Read the log, don't assume a silent process is healthy.
- There are no tests. Verify changes by running the real thing against the hardware.
