import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import { createSyncStateChannels, type SyncStateChannelOptions } from "./channels";
import type { SyncStateBridge, SyncStateListener } from "./types";

export const createSyncStateBridge = (): SyncStateBridge => {
  const get = async <StateValue>(options: SyncStateChannelOptions): Promise<StateValue> => {
    const channels = createSyncStateChannels(options);
    return (await ipcRenderer.invoke(channels.getChannel)) as StateValue;
  };

  const set = async <StateValue>(
    options: SyncStateChannelOptions,
    value: StateValue,
  ): Promise<void> => {
    const channels = createSyncStateChannels(options);
    await ipcRenderer.invoke(channels.setChannel, value);
  };

  const subscribe = <StateValue>(
    options: SyncStateChannelOptions,
    listener: SyncStateListener<StateValue>,
  ): (() => void) => {
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

export const exposeSyncState = (): void => {
  const bridge = createSyncStateBridge();
  contextBridge.exposeInMainWorld("syncState", bridge);
};

export type { SyncStateBridge, SyncStateListener } from "./types";
export type { SyncStateChannelOptions } from "./channels";
