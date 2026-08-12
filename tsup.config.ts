import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  // the raspberry pi runs an older node, keep the output compatible
  target: "node18",
  outDir: "dist",
  clean: true,
});
