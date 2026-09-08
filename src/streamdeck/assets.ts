import fs from "node:fs";
import path from "node:path";
import { logger } from "~/utils/logger";

/**
 * Asset resolution.
 *
 * History: this used to be `__dirname`-relative (bundle lands in `dist/`, one
 * level below the repo root, same depth as `assets/`). Bun's bundler bakes
 * `__dirname` in as the *source file's absolute path on the build machine*
 * instead of rewriting it to the output directory like tsup/esbuild did, so
 * that broke and hardcoded a build-machine path into the bundle. `import.meta`
 * has the same problem (resolved at build time, not runtime).
 *
 * So this stays `process.cwd()`-relative on purpose, sharing one invariant
 * with dotenv (`<cwd>/.env`) and the systemd unit's `WorkingDirectory=`:
 * whatever starts the process must do so from the repo root. What changed is
 * that the failure mode is now fail-fast with a clear error instead of an
 * obscure per-key sharp ENOENT: call `verifyAssetsOrThrow()` once at boot.
 *
 * `STREAMDECK_ASSETS_DIR` overrides the directory (tests, unusual layouts).
 */
export const getAssetsDir = (): string =>
  process.env.STREAMDECK_ASSETS_DIR ?? path.resolve(process.cwd(), "assets");

export const assetPath = (filename: string): string =>
  path.resolve(getAssetsDir(), filename);

const REQUIRED_ASSETS = [
  "black.png",
  "blue.png",
  "light_blue.png",
  "red.png",
  "orange.png",
];

/** Throws with an actionable message when assets can't be resolved. */
export const verifyAssetsOrThrow = (): string => {
  const dir = getAssetsDir();
  const missing = REQUIRED_ASSETS.filter(
    (f) => !fs.existsSync(path.resolve(dir, f)),
  );
  if (missing.length === 0) return dir;
  const msg =
    `assets missing in "${dir}" (missing: ${missing.join(", ")}). ` +
    `Start the process from the repo root (dotenv + assets are cwd-relative), ` +
    `check the systemd unit's WorkingDirectory=, or set STREAMDECK_ASSETS_DIR. ` +
    `cwd is "${process.cwd()}".`;
  logger.error(msg);
  throw new Error(msg);
};
