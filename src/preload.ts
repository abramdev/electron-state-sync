import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import { createSyncStateChannels, type SyncStateChannelOptions } from "./channels";
import type { SyncStateBridge, SyncStateListener } from "./types";

// Create renderer bridge object
export const createSyncStateBridge = (): SyncStateBridge => {
  const get = async <StateValue>(options: SyncStateChannelOptions): Promise<StateValue> => {
    // IPC channel names
    const channels = createSyncStateChannels(options);
    return (await ipcRenderer.invoke(channels.getChannel)) as StateValue;
  };

  const set = async <StateValue>(
    options: SyncStateChannelOptions,
    value: StateValue,
  ): Promise<void> => {
    // IPC channel names
    const channels = createSyncStateChannels(options);
    await ipcRenderer.invoke(channels.setChannel, value);
  };

  const subscribe = <StateValue>(
    options: SyncStateChannelOptions,
    listener: SyncStateListener<StateValue>,
  ): (() => void) => {
    // IPC channel names
    const channels = createSyncStateChannels(options);
    const handler = (_event: IpcRendererEvent, value: StateValue): void => {
      listener(value);
    };

    ipcRenderer.on(channels.updateChannel, handler);
    ipcRenderer.send(channels.subscribeChannel);

    return () => {
      ipcRenderer.off(channels.updateChannel, handler);
      ipcRenderer.send(channels.unsubscribeChannel);
    };
  };

  return {
    get,
    set,
    subscribe,
  };
};

// Expose safe sync API
export const exposeSyncState = (): void => {
  // Bridge object in preload
  const bridge = createSyncStateBridge();
  contextBridge.exposeInMainWorld("syncState", bridge);
};

export type { SyncStateBridge, SyncStateListener } from "./types";
export type { SyncStateChannelOptions } from "./channels";
