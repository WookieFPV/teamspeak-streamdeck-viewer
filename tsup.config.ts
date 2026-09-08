import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  // node 22 is the newest version with official armv7l builds; keep the output compatible
  target: "node22",
  outDir: "dist",
  clean: true,
  // is-online is ESM-only since v12; bundle it so the cjs output does not
  // require() an ESM module (breaks on node < 22.12)
  noExternal: [
    "is-online",
    "public-ip",
    "fetch-extras",
    "p-any",
    "p-timeout",
    "got",
    "dns-socket",
    "dns-packet",
    "is-ip",
    "@leichtgewicht/ip-codec",
  ],
});
