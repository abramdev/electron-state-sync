import type { SyncStateBridge } from "../types";

// 渲染层全局注入的同步桥接定义
declare global {
  interface Window {
    // 预加载脚本注入的同步 API
    syncState?: SyncStateBridge;
  }
}
