const { contextBridge } = require("electron");
const { join } = require("node:path");

// 根据隔离配置暴露全局变量
const exposeInMainWorld = (key, value) => {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld(key, value);
    return;
  }

  globalThis[key] = value;
};

// 记录预加载已执行
exposeInMainWorld("__preloadReady", true);

try {
  const preloadEntry = join(__dirname, "../dist/preload.cjs");
  const { createSyncStateBridge } = require(preloadEntry);
  // 渲染端桥接实例
  const bridge = createSyncStateBridge();

  exposeInMainWorld("syncState", bridge);
  exposeInMainWorld("__syncStateReady", true);
} catch (error) {
  console.error("e2e:preload-error", error);
  exposeInMainWorld("__syncStateError", String(error));
}
