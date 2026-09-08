# CLAUDE.md

Guide for AI assistants working on this repo. Host-specific deployment details (ssh target, paths)
are in `CLAUDE.local.md`, which is intentionally **not** committed — this repo is public.

## What this is

A long-running node process that displays TeamSpeak clients on an Elgato Stream Deck. It is not a
library and has no tests: it polls/subscribes to a TeamSpeak backend, then paints one key per
client. It runs 24/7 on a raspberry pi with a Stream Deck Mini attached.

## Toolchain constraints (read before upgrading anything)

The production device is a Raspberry Pi Zero 2 W (armv7l, 32-bit Raspbian Buster, ~427MB RAM)
running **node 22**. That drives everything:

- **Node 22 is the ceiling, not a preference.** Node dropped official `linux-armv7l` prebuilt
  binaries starting with Node 24 (32-bit ARM was downgraded to experimental); the unofficial-builds
  mirror stopped shipping them too. 22.x (LTS "Jod") is the newest version with an official armv7l
  tarball. Don't bump past 22 without checking nodejs.org's dist listing for a `linux-armv7l` file
  under the target version first — a bare "latest LTS" bump (e.g. via Renovate) will silently
  produce a `.nvmrc`/`engines` value that has no working binary for this device.
- **bun does not work there.** It only ships arm64 builds; this device is 32-bit. A bun migration
  was tried and reverted before this was well understood. The only way to unlock bun is reflashing
  the device to 64-bit Raspberry Pi OS (aarch64) — a deliberate, disruptive project, not a toolchain
  tweak. Stay on node + tsup unless that happens.
- **pnpm is on 12.x** via the `packageManager` field (bumped from 10.x now that node 22 clears
  pnpm 11's `>=22.13` floor; pnpm 12 itself relaxed back down to `>=18`, so this wasn't strictly
  node-gated, just done alongside the node bump). pnpm 11 removed `package.json`'s `pnpm.*` config
  block entirely — `onlyBuiltDependencies` now lives in `pnpm-workspace.yaml` as `allowBuilds`
  (a name → boolean map, replacing the old array-of-allowed-names shape). `ssh2` / `cpu-features`
  are set to `false` there, same reasoning as below.
- Build target is `node22` (`tsup.config.ts`), `engines.node` is `>=22.12`, `.nvmrc` is `22`.
  `>=22.12` specifically is where `require(esm)` became unflagged, which is why `wretch` (v3,
  ESM-only) and `p-wait-for` (v6, ESM-only) can be required directly from the cjs bundle again —
  see git history around "pin p-wait-for and wretch to CJS-compatible versions" for what breaks
  below that version. `sharp` is unpinned back to `^0.35.4` for the same reason (it needs
  node >=20.9); `@img/sharp-linux-arm` still ships armv7 prebuilds at that version.
- `ssh2` / `cpu-features` are deliberately set to `false` in `pnpm-workspace.yaml`'s `allowBuilds`:
  optional native speedups that would need a node-gyp toolchain on the pi. The pure JS fallback is
  used.
- Native deps that must keep working on armv7: `sharp`, `node-hid`, `@julusian/jpeg-turbo`.

Check any dependency bump against node 22 on armv7l before proposing it.

## Commands

| command           | what it does                                        |
|-------------------|-----------------------------------------------------|
| `pnpm install`    | install (uses `pnpm-lock.yaml`)                     |
| `pnpm start`      | dev: tsup watch + nodemon restart                   |
| `pnpm build`      | bundle to `dist/index.js` (cjs, target node22)      |
| `pnpm start-prod` | `node dist/index.js` — what production runs         |
| `pnpm check`      | biome lint + format with autofix                    |
| `pnpm check-ci`   | `biome ci`, non-mutating (used by CI)               |
| `pnpm typecheck`  | `tsc --noEmit`                                      |

CI (`.github/workflows/ci.yml`) runs check-ci, typecheck and build on node 22.

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
