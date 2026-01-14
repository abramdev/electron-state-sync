import { defineConfig } from "tsdown";

// 主进程打包配置
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: ["electron"],
});
