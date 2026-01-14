import { contextBridge } from "electron";

import { exposeSyncState } from "../dist/preload.js";

// 记录预加载已执行
console.log("e2e:preload");
contextBridge.exposeInMainWorld("__preloadReady", true);

// 暴露同步桥接 API
typeof exposeSyncState === "function" && exposeSyncState();
