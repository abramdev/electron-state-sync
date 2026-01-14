import type { SyncStateBridge } from "../types";

interface SyncStateGlobal {
  syncState?: SyncStateBridge;
}

export const resolveSyncStateBridge = (bridge?: SyncStateBridge): SyncStateBridge => {
  const globalBridge = (globalThis as SyncStateGlobal).syncState;
  const resolvedBridge = bridge ?? globalBridge;

  if (!resolvedBridge) {
    throw new Error("globalThis.syncState not injected, please check preload configuration");
  }

  return resolvedBridge;
};
