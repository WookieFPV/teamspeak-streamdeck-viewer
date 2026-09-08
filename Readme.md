## About The Project

Effortlessly monitor the online status of users on your Teamspeak Server right from your Elgato Streamdeck.  
This project utilizes the Teamspeak Query API, requiring specific server credentials.  
With this tool, you can gain insights into connected users without the need to join the server.
Additionally, when connected, it provides a real-time display of all clients connected to the channel.

## Getting Started

Requires [bun](https://bun.sh) >= 1.4 (the version is pinned via the `packageManager` field).

1. Install the dependencies: `bun install`.
2. Create a `.env` file by copying the provided example: `cp .env.example .env`.
3. Fill in the server query credentials in the newly created `.env` file.
4. Start it in watch mode: `bun run start`.

### Scripts

| command             | what it does                                          |
|---------------------|--------------------------------------------------------|
| `bun run start`     | build in watch mode + restart on change (development)  |
| `bun run build`     | bundle to `dist/index.js` (target: node/cjs, via bun)  |
| `bun run start-prod`| run the built bundle: `bun dist/index.js`              |
| `bun test`        | unit tests for the pure modules (layout, svg, events, store) |
| `bun run check`     | biome lint + format, with autofix                      |
| `bun run typecheck` | `tsc --noEmit`                                         |

## Key Features

* **User Status Display:**
  * view online clients along with their status (AFK, Mute, etc.).
  * Access this information even without being actively connected to the server.

* **Filter client based on your Channel**
* **Idle time of clients**
* **Show Time if no User is online**

## Raspberry Pi (Linux)

1. Configure udev rules
   1. check the Id of your device with `lsusb` (example: `Bus 001 Device 003: ID 0fd9:0090 Elgato Systems GmbH`)
   2. add rule file: `sudo nano /etc/udev/rules.d/99-streamdeck.rules`
   3. add `SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", MODE="0664", GROUP="plugdev"` (you might adapt the idProduct based of the output from `lsusb`)
   4. reload rules `sudo udevadm trigger`
2. default font might not be available (`fontconfig` is needed for sharp to render text onto keys;
   install it plus a font like `fonts-dejavu-core` if missing)
3. bun ships prebuilt aarch64 (64-bit) binaries directly — no unofficial builds needed, unlike the
   old 32-bit armv7l setup this project used to run on
4. build on a faster machine and copy `dist/` + `assets/` + `.env` over if `bun run build` is too
   slow on the Pi

The `ssh2` / `cpu-features` install script is intentionally not trusted (see `trustedDependencies`
in `package.json`): it's an optional native speedup for the Teamspeak query connection that would
need a full node-gyp toolchain on the Pi, and the pure JS fallback works fine.

## Roadmap

- [x] Extend support for Raspberry Pi.
- [X] Validate .env file at runtime
- [x] add clock that is shown if no users are online
- [ ] To be determined (tbd).
