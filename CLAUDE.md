# CLAUDE.md

Guide for AI assistants working on this repo. Host-specific deployment details (ssh target, paths)
are in `CLAUDE.local.md`, which is intentionally **not** committed — this repo is public.

## What this is

A long-running bun process that displays TeamSpeak clients on an Elgato Stream Deck. It is not a
library: it polls/subscribes to a TeamSpeak backend, then paints one key per
client. It runs 24/7 on a raspberry pi with a Stream Deck Mini attached. Pure logic
(layout, svg rendering, event parsing, caching) has `bun test` unit tests; the rest is
verified by running the real thing against the hardware.

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
  `trustedDependencies` in `package.json`: currently `sharp`, `node-hid`,
  `@biomejs/biome`. Run `bun pm untrusted` to see what's currently blocked, `bun pm trust <name>` to
  allow one, or add it under `trustedDependencies` directly (preferred — keeps it in git).
- Build target is `bun build ./src/index.ts --outdir dist --target node --format cjs` (see the
  `build` script in `package.json`) — replaced `tsup`, which is no longer a dependency. `--target
  node` (not `bun`) plus `--format cjs` keeps CJS semantics the same as the old tsup output, so
  nothing about the runtime module system changed. Note that unlike tsup/esbuild, bun's bundler does
  **not** rewrite `__dirname` to the output file's directory — it bakes in the original source file's
  path instead (see "Things that will bite you" below for why that broke asset loading and how it was
  fixed). All HTTP/websocket code uses the platform `fetch`/`WebSocket` globals, so there are
  no ESM-only runtime dependencies left to worry about.
- Native modules that can't be bundled (their `require()` resolves a real `.node` binary via a
  relative path that bundling would break) are passed as `--external` in the `build` script: `sharp`,
  `node-hid`, and `cpu-features` (ssh2's optional native speedup, deliberately
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
- Native deps that must keep building on aarch64: `sharp`, `node-hid`. Both
  were smoke-tested loading their native binding directly under bun (x86_64 dev sandbox) before
  this migration; the actual aarch64 prebuilds still need verifying on the pi itself the first time.
  `@julusian/jpeg-turbo` (an optional peer of the elgato deck lib) is deliberately *not* a direct
  dependency anymore: the bundler inlines its JS with a build-machine `__dirname`, so its native
  binding never loads from the bundle and the deck lib falls back to pure-JS `jpeg-js` encoding.
  Key paints still work, just slightly slower — acceptable on purpose to avoid a cmake-js toolchain
  on the pi.
- The Elgato Stream Deck Mini needs udev rules granting the `pi` user (via the `plugdev` group)
  access to the USB HID device — not in this repo, device-specific, see `CLAUDE.local.md`.

## Commands

| command             | what it does                                              |
|---------------------|------------------------------------------------------------|
| `bun install`       | install (uses `bun.lock`)                                  |
| `bun run start`     | dev: `bun build --watch` + `bun --watch dist/index.js`, via `concurrently` |
| `bun run build`     | bundle to `dist/index.js` (cjs, target node, native deps external) |
| `bun run start-prod`| `bun dist/index.js` — what production runs                 |
| `bun test`          | unit tests for the pure modules (layout, svg, events, store) |
| `bun run check`     | biome lint + format with autofix                            |
| `bun run check-ci`  | `biome ci`, non-mutating (used by CI)                        |
| `bun run typecheck` | `tsc --noEmit`                                              |

CI (`.github/workflows/ci.yml`) runs bun test, check-ci, typecheck and build on bun.

## Structure

Entry point is `src/index.ts`: get the Stream Deck, wait for network, build a backend, then loop
forever — fetch clients, draw them, sleep for a backend-dependent delay, and swallow/log errors so
the process never dies. The sleep is interruptible (`waitForRefresh` in `src/utils/refreshTrigger.ts`):
backend events (TS3 notifications, websocket messages) call `requestRefresh()` so the loop refetches
and repaints immediately instead of waiting out the full delay; the main loop is the sole painter.

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
  - `store.ts` (`src/utils/`) — tiny explicit cache each backend owns: `fetch()` with a
    stale window, `invalidate()` on events. No hidden fetch semantics.
  - `tsDrawClients.ts` / `tsHelper.ts` / `addLastActiveTime.ts` — turn a client list into what goes
    on the keys (ordering, idle time, polling delay).
- `src/streamdeck/` — `getStreamdeck.ts` opens the device, `layout.ts` plans which client goes on
  which key (pure, tested), `renderer.ts` builds the SVG text layer (pure, tested), `deck.ts`
  composites it onto a background PNG with sharp and pushes the raw buffer to a key, `colors.ts`
  maps client state (talking, muted, afk, main user) to one of the PNGs in `assets/`.
- `src/utils/logger.ts` — winston. Everything logs through it, never `console.log`.

## Things that will bite you

- **`dist/` is not in git.** After pulling on the device you must `bun run build` before restarting.
- **Asset paths are `cwd`-relative, not `__dirname`-relative.** `deck.ts` resolves
  `path.resolve(process.cwd(), "assets", ...)`. This used to be `__dirname`-based (relying on the
  bundle landing in `dist/`, one level below the repo root, same depth as `assets/`), but bun's
  bundler bakes `__dirname` in as the *original source file's absolute path on the machine that ran
  the build* rather than rewriting it to the output file's directory the way tsup/esbuild did — so
  after the bun migration it resolved to `src/streamdeck/../assets` (wrong, and worse, machine
  path was hardcoded into the bundle) instead of `dist/../assets`. `process.cwd()` sidesteps the
  bundler behavior entirely and matches the dotenv assumption below, so both now depend on the same
  invariant: whatever starts the process must do so from the repo root.
- **dotenv reads `<cwd>/.env`**, so the working directory the process is started from matters — the
  systemd unit's `WorkingDirectory=` and asset resolution above both depend on this.
- The main loop catches everything and keeps going, so failures show up as repeated log lines
  rather than a crash. Read the log, don't assume a silent process is healthy.
- The websocket uses an `access_token` query parameter (native `WebSocket` can't send handshake
  headers) — the customApi server must accept query-param auth or the socket won't connect.
