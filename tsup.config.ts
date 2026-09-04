import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  // the raspberry pi runs an older node, keep the output compatible
  target: "node18",
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
