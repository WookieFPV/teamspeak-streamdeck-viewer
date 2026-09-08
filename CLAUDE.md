# CLAUDE.md

Guide for AI assistants working on this repo. Host-specific deployment details (ssh target, paths)
are in `CLAUDE.local.md`, which is intentionally **not** committed — this repo is public.

## What this is

A long-running bun process that displays TeamSpeak clients on an Elgato Stream Deck. It is not a
library and has no tests: it polls/subscribes to a TeamSpeak backend, then paints one key per
client. It runs 24/7 on a raspberry pi with a Stream Deck Mini attached.

## Toolchain constraints (read before upgrading anything)

The production device is a Raspberry Pi Zero 2 W (**aarch64**, 64-bit Raspberry Pi OS, ~427MB RAM)
running **bun** (no node/nvm on the device anymore — see below). That drives everything:

- **This device used to be 32-bit (armv7l) Raspbian Buster.** It was reflashed to 64-bit to get past
  a hard node-version ceiling (Buster's `libstdc++6` topped out below what Node 20+ needs — see git
  history around the "revert: node 22 / pnpm 12 bump" commit on `master`), and later migrated from
  node+pnpm to **bun** entirely. Bun ships arm64 builds only, so the 32-bit-only limitation that used
  to block it is gone on the 64-bit OS; there's no known version ceiling for bun on this device either
  — track current bun and bump when it moves, same as any normal project.
- **Runtime and package manager are both bun** — `bun install` reads/writes `bun.lock` (a human
  readable text lockfile, not the old binary `bun.lockb` format), pinned via the `packageManager`
  field. There is no separate node install: bun implements the node APIs this project needs
  (including enough Node-API/N-API compat for the native addons below) directly.
- **Native postinstall scripts are blocked by default** — bun's security model. Packages that need
  their install script to run (to build or unpack a native binding) must be listed in
  `trustedDependencies` in `package.json`: currently `sharp`, `node-hid`, `@julusian/jpeg-turbo`,
  `@biomejs/biome`. Run `bun pm untrusted` to see what's currently blocked, `bun pm trust <name>` to
  allow one, or add it under `trustedDependencies` directly (preferred — keeps it in git).
- Build target is `bun build ./src/index.ts --outdir dist --target node --format cjs` (see the
  `build` script in `package.json`) — replaced `tsup`, which is no longer a dependency. `--target
  node` (not `bun`) plus `--format cjs` is deliberate: it keeps `__dirname` working for the
  dist-relative asset paths (see "Things that will bite you" below) and keeps CJS semantics the same
  as the old tsup output, so nothing else about the runtime behavior changed. Bun's bundler resolves
  ESM-only deps (`wretch`, `p-wait-for`, `is-online`) itself at build time — no more `require(esm)`
  runtime workaround needed.
- Native modules that can't be bundled (their `require()` resolves a real `.node` binary via a
  relative path that bundling would break) are passed as `--external` in the `build` script: `sharp`,
  `node-hid`, `@julusian/jpeg-turbo`, and `cpu-features` (ssh2's optional native speedup, deliberately
  never built — see next point — but the bundler still needs telling not to try to resolve its
  `.node` file at build time, since `ssh2` requires it in a `try/catch` that only helps at runtime).
  If a new native dependency is added, it needs the same `--external` treatment or the build fails
  immediately with an unresolved-`.node`-file error (easy to spot, not silent).
- `ssh2` / `cpu-features`: `cpu-features` is an optional native speedup for `ssh2` (pulled in
  transitively, not a direct dependency) that needs a node-gyp toolchain. It's deliberately left out
  of `trustedDependencies`, so its install script never runs and `ssh2` falls back to its pure-JS
  path (wrapped in `try/catch` in `ssh2`'s own source) — this was originally about avoiding a
  toolchain on the old OS; worth reconsidering now that `build-essential` is installed on the device
  anyway for other native deps.
- Native deps that must keep building on aarch64: `sharp`, `node-hid`, `@julusian/jpeg-turbo`. All
  three were smoke-tested loading their native binding directly under bun (x86_64 dev sandbox) before
  this migration; the actual aarch64 prebuilds still need verifying on the pi itself the first time.
- The Elgato Stream Deck Mini needs udev rules granting the `pi` user (via the `plugdev` group)
  access to the USB HID device — not in this repo, device-specific, see `CLAUDE.local.md`.

## Commands

| command             | what it does                                              |
|---------------------|------------------------------------------------------------|
| `bun install`       | install (uses `bun.lock`)                                  |
| `bun run start`     | dev: `bun build --watch` + `bun --watch dist/index.js`, via `concurrently` |
| `bun run build`     | bundle to `dist/index.js` (cjs, target node, native deps external) |
| `bun run start-prod`| `bun dist/index.js` — what production runs                 |
| `bun run check`     | biome lint + format with autofix                            |
| `bun run check-ci`  | `biome ci`, non-mutating (used by CI)                        |
| `bun run typecheck` | `tsc --noEmit`                                              |

CI (`.github/workflows/ci.yml`) runs check-ci, typecheck and build on bun.

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

- **`dist/` is not in git.** After pulling on the device you must `bun run build` before restarting.
- **Asset paths are `dist`-relative.** `paintStreamdeck.ts` resolves `path.resolve(__dirname,
  "../assets/...")`, which only works because the bundle lands in `dist/`. Don't "fix" this to be
  src-relative. This is also why the build targets CJS (`--format cjs`), not ESM: `__dirname` doesn't
  exist in ESM (`import.meta.dirname` would be the equivalent) — if the build ever moves to ESM
  output, this needs updating too, not just left to break.
- **dotenv reads `<cwd>/.env`**, so the working directory the process is started from matters.
- The main loop catches everything and keeps going, so failures show up as repeated log lines
  rather than a crash. Read the log, don't assume a silent process is healthy.
- There are no tests. Verify changes by running the real thing against the hardware.
