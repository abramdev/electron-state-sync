const { contextBridge } = require("electron");
const { join } = require("node:path");

// Expose global variables based on isolation config
const exposeInMainWorld = (key, value) => {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld(key, value);
    return;
  }

  globalThis[key] = value;
};

// Record that preload has executed
exposeInMainWorld("__preloadReady", true);

try {
  const preloadEntry = join(__dirname, "../dist/preload.cjs");
  const { createSyncStateBridge } = require(preloadEntry);
  // Renderer bridge instance
  const bridge = createSyncStateBridge();

  exposeInMainWorld("syncState", bridge);
  exposeInMainWorld("__syncStateReady", true);
} catch (error) {
  console.error("e2e:preload-error", error);
  exposeInMainWorld("__syncStateError", String(error));
}
