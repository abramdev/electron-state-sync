import { defineConfig } from "tsdown";

// Preload script build configuration
export default defineConfig({
  entry: ["src/preload.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: ["electron"],
  clean: false,
});
