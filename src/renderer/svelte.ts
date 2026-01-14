import { get, writable, type Readable, type Updater, type Writable } from "svelte/store";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface SyncStateSvelteOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

interface RemoteUpdateTracker<StateValue> {
  applyRemoteValue: (value: StateValue) => void;
  shouldSkipLocalSync: () => boolean;
}

export interface SyncStateStore<StateValue> extends Writable<StateValue> {
  isSynced: Readable<boolean>;
}

const createChannelOptions = (options: SyncStateSvelteOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

const createRemoteUpdateTracker = <StateValue>(
  setStoreValue: (value: StateValue) => void,
  isSynced: Writable<boolean>,
): RemoteUpdateTracker<StateValue> => {
  let isRemoteUpdate = false;

  const applyRemoteValue = (value: StateValue): void => {
    isRemoteUpdate = true;
    setStoreValue(value);
    isSynced.set(true);
  };

  const shouldSkipLocalSync = (): boolean => {
    if (!isRemoteUpdate) {
      return false;
    }
    isRemoteUpdate = false;
    return true;
  };

  return {
    applyRemoteValue,
    shouldSkipLocalSync,
  };
};

export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: SyncStateSvelteOptions,
): SyncStateStore<StateValue> => {
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);
  const isSynced = writable(false);
  let tracker: RemoteUpdateTracker<StateValue> | undefined = undefined;

  const store = writable(initialValue, (setStoreValue) => {
    tracker = createRemoteUpdateTracker(setStoreValue, isSynced);
    const unsubscribe = bridge.subscribe(channelOptions, tracker.applyRemoteValue);
    void bridge.get<StateValue>(channelOptions).then(tracker.applyRemoteValue);

    return () => {
      unsubscribe();
      tracker = undefined;
    };
  });

  const set = (value: StateValue): void => {
    if (tracker?.shouldSkipLocalSync()) {
      store.set(value);
      return;
    }

    store.set(value);
    void bridge.set(channelOptions, value);
  };

  const update = (updater: Updater<StateValue>): void => {
    const nextValue = updater(get(store));
    set(nextValue);
  };

  return {
    isSynced,
    set,
    subscribe: store.subscribe,
    update,
  };
};

// Backward compatibility alias
export { useSyncState as createSyncStateStore };
