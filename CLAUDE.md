# CLAUDE.md

Guide for AI assistants working on this repo. Host-specific deployment details (ssh target, paths)
are in `CLAUDE.local.md`, which is intentionally **not** committed — this repo is public.

## What this is

A long-running node process that displays TeamSpeak clients on an Elgato Stream Deck. It is not a
library and has no tests: it polls/subscribes to a TeamSpeak backend, then paints one key per
client. It runs 24/7 on a raspberry pi with a Stream Deck Mini attached.

## Toolchain constraints (read before upgrading anything)

The production device is a Raspberry Pi Zero 2 W (**aarch64**, 64-bit Raspberry Pi OS, ~427MB RAM)
running **node 24 (latest LTS)**. That drives everything:

- **This device used to be 32-bit (armv7l) Raspbian Buster.** It was reflashed to 64-bit specifically
  to get past a hard ceiling: Buster's `libstdc++6` (gcc 8.3) only provides up to `GLIBCXX_3.4.25`,
  and Node's official builds need `3.4.26`+ starting at Node 20 — so on the old OS, Node 18 was the
  real ceiling regardless of architecture-level armv7l availability (verified empirically; see the
  git history around the "revert: node 22 / pnpm 12 bump" commit on `master` for the full story
  before this branch was merged). None of that applies anymore: on 64-bit, there's no known Node
  version ceiling — track current LTS and bump when it moves, same as any normal project.
- **bun now works here.** The old 32-bit-only limitation (bun ships arm64 builds only) is gone. Not
  adopted yet — would still need to redo the tsup/build story — but no longer blocked architecturally.
- **pnpm is on 12.x** via the `packageManager` field. pnpm 11 removed `package.json`'s `pnpm.*`
  config block entirely — `onlyBuiltDependencies` now lives in `pnpm-workspace.yaml` as `allowBuilds`
  (a name → boolean map, replacing the old array-of-allowed-names shape). `ssh2` / `cpu-features`
  are set to `false` there — see below.
- Build target is `node24` (`tsup.config.ts`), `engines.node` is `>=24`, `.nvmrc` is `24`. `wretch`
  (v3, ESM-only) and `p-wait-for` (v6, ESM-only) are required directly from the cjs bundle via
  `require(esm)`, stable since node 22.12 — comfortably covered now. `sharp` is on `^0.35.4`.
- `ssh2` / `cpu-features` are deliberately set to `false` in `pnpm-workspace.yaml`'s `allowBuilds`:
  optional native speedups that would need a node-gyp toolchain on the pi. The pure JS fallback is
  used — this was originally about avoiding a toolchain on the old OS; worth reconsidering now that
  `build-essential` is installed on the device anyway for other native deps.
- Native deps that must keep building on aarch64: `sharp`, `node-hid`, `@julusian/jpeg-turbo`.
- The Elgato Stream Deck Mini needs udev rules granting the `pi` user (via the `plugdev` group)
  access to the USB HID device — not in this repo, device-specific, see `CLAUDE.local.md`.

## Commands

| command           | what it does                                        |
|-------------------|-----------------------------------------------------|
| `pnpm install`    | install (uses `pnpm-lock.yaml`)                     |
| `pnpm start`      | dev: tsup watch + nodemon restart                   |
| `pnpm build`      | bundle to `dist/index.js` (cjs, target node24)      |
| `pnpm start-prod` | `node dist/index.js` — what production runs         |
| `pnpm check`      | biome lint + format with autofix                    |
| `pnpm check-ci`   | `biome ci`, non-mutating (used by CI)               |
| `pnpm typecheck`  | `tsc --noEmit`                                      |

CI (`.github/workflows/ci.yml`) runs check-ci, typecheck and build on node 24.

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
