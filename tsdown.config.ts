import { defineConfig } from "tsdown";

// Renderer build configuration
export default defineConfig({
  entry: {
    "renderer/index": "src/renderer/index.ts",
    "react": "src/renderer/react.ts",
    "preact": "src/renderer/preact.ts",
    "vue": "src/renderer/vue.ts",
    "svelte": "src/renderer/svelte.ts",
    "solid": "src/renderer/solid.ts",
    "zustand": "src/renderer/zustand.ts",
    "react-query": "src/renderer/react-query.ts",
    "jotai": "src/renderer/jotai.ts",
    "redux": "src/renderer/redux.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  external: [
    "react",
    "react-dom",
    "preact",
    "preact/hooks",
    "solid-js",
    "svelte",
    "vue",
    "zustand",
    "@tanstack/react-query",
    "jotai",
    "@reduxjs/toolkit",
    "react-redux",
  ],
  clean: false,
});
