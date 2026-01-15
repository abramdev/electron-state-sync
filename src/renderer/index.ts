import "./window";

import type { SyncStateBridge } from "../types";

export { resolveSyncStateBridge } from "./bridge";

export { createSyncStateChannels } from "../channels";
export type { SyncStateChannelOptions, SyncStateChannels } from "../channels";

export { SyncStateError } from "../types";
export type { SyncStateBridge, SyncStateErrorCode, SyncStateListener } from "../types";

export interface SyncStateRendererGlobalConfig {
  baseChannel?: string;
  bridge?: SyncStateBridge;
}

let globalConfig: SyncStateRendererGlobalConfig = {};

export const initSyncState = (config: SyncStateRendererGlobalConfig): void => {
  globalConfig = { ...config };
};

export const getGlobalConfig = (): SyncStateRendererGlobalConfig => globalConfig;
