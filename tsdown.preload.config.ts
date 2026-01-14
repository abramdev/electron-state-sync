import { defineConfig } from "tsdown";

// 预加载脚本打包配置
export default defineConfig({
  entry: ["src/preload.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: ["electron"],
  clean: false,
});
