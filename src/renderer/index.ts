import "./window";

// Renderer common entry
export { resolveSyncStateBridge } from "./bridge";

export { createSyncStateChannels } from "../channels";
export type { SyncStateChannelOptions, SyncStateChannels } from "../channels";

export { SyncStateError } from "../types";
export type { SyncStateBridge, SyncStateErrorCode, SyncStateListener } from "../types";

// Renderer global configuration interface
export interface SyncStateRendererGlobalConfig {
  // Channel base prefix (default: "state")
  baseChannel?: string;
  // Optional custom bridge implementation
  bridge?: SyncStateBridge;
}

// Global configuration storage (closure)
let globalConfig: SyncStateRendererGlobalConfig = {};

// Initialize renderer global configuration
export const initSyncState = (config: SyncStateRendererGlobalConfig): void => {
  globalConfig = { ...config };
};

// Get global configuration
export const getGlobalConfig = (): SyncStateRendererGlobalConfig => globalConfig;
