import { defineConfig } from "tsdown";

// Main process build configuration
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: ["electron"],
});
