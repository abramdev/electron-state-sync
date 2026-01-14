import { defineConfig } from "tsdown";

// 渲染端打包配置
export default defineConfig({
  entry: {
    "renderer/index": "src/renderer/index.ts",
    "react": "src/renderer/react.ts",
    "vue": "src/renderer/vue.ts",
    "svelte": "src/renderer/svelte.ts",
    "solid": "src/renderer/solid.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: ["react", "react-dom", "solid-js", "svelte", "vue"],
  clean: false,
});
