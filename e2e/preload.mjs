import { contextBridge } from "electron";

import { exposeSyncState } from "../dist/preload.js";

// Record that preload has executed
console.log("e2e:preload");
contextBridge.exposeInMainWorld("__preloadReady", true);

// Expose sync bridge API
typeof exposeSyncState === "function" && exposeSyncState();
