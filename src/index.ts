// Entry point for the sync state library
export { createSyncStateChannels } from "./channels";
export type { SyncStateChannelOptions, SyncStateChannels } from "./channels";

export { initSyncStateMain, state } from "./main";
export type { SyncStateMainGlobalConfig, SyncStateMainHandle, SyncStateMainOptions } from "./main";

export { createSyncStateBridge, exposeSyncState } from "./preload";

export { initSyncState, resolveSyncStateBridge } from "./renderer";
export type { SyncStateRendererGlobalConfig } from "./renderer";

export { useSyncStateReact } from "./renderer/react";
export type { UseSyncStateReactOptions, UseSyncStateReactResult } from "./renderer/react";

export { useSyncState } from "./renderer/vue";
export type { UseSyncStateOptions } from "./renderer/vue";

export { createSyncStateStore } from "./renderer/svelte";
export type { SyncStateSvelteOptions } from "./renderer/svelte";

export { useSyncStateSolid } from "./renderer/solid";
export type { UseSyncStateSolidOptions, UseSyncStateSolidResult } from "./renderer/solid";

export { SyncStateError } from "./types";
export type { SyncStateBridge, SyncStateErrorCode, SyncStateListener } from "./types";
