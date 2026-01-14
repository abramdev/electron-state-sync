import type { SyncStateBridge } from "../types";

// Global sync bridge type
interface SyncStateGlobal {
  // Sync API injected by preload
  syncState?: SyncStateBridge;
}

// Get available sync bridge
export const resolveSyncStateBridge = (bridge?: SyncStateBridge): SyncStateBridge => {
  // Global bridge reference
  const globalBridge = (globalThis as SyncStateGlobal).syncState;
  // Bridge to actually use
  const resolvedBridge = bridge ?? globalBridge;

  if (!resolvedBridge) {
    throw new Error("globalThis.syncState not injected, please check preload configuration");
  }

  return resolvedBridge;
};
