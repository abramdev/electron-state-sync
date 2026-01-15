import { isProxy, onBeforeUnmount, onMounted, ref, toRaw, watch, type Ref } from "vue";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface UseSyncStateOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
  deep?: boolean;
}

interface RemoteUpdateTracker<StateValue> {
  applyRemoteValue: (value: StateValue) => void;
  shouldSkipLocalSync: (currentValue: StateValue) => boolean;
}

const createChannelOptions = (options: UseSyncStateOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

// Convert Vue Proxy to serializable raw value
const resolveSyncValue = <StateValue>(value: StateValue): StateValue => {
  if (value !== null && typeof value === "object" && isProxy(value)) {
    return toRaw(value) as StateValue;
  }

  return value;
};

const createRemoteUpdateTracker = <StateValue>(
  stateRef: Ref<StateValue>,
  isSynced: Ref<boolean>,
): RemoteUpdateTracker<StateValue> => {
  let isApplyingRemoteValue = false;
  // Record the last raw value synced from main process
  let lastRemoteValue: StateValue | undefined = undefined;

  const applyRemoteValue = (value: StateValue): void => {
    // Convert remote synced value to raw object
    const resolvedValue = resolveSyncValue(value);
    isApplyingRemoteValue = true;
    lastRemoteValue = resolvedValue;
    stateRef.value = resolvedValue;
    isSynced.value = true;
    isApplyingRemoteValue = false;
  };

  const shouldSkipLocalSync = (currentValue: StateValue): boolean =>
    // Skip sync if we're currently applying a remote value AND it matches
    // This prevents infinite loops while allowing all local updates to sync
    isApplyingRemoteValue && resolveSyncValue(currentValue) === lastRemoteValue;

  return {
    applyRemoteValue,
    shouldSkipLocalSync,
  };
};

interface StateWatcherOptions<StateValue> {
  bridge: SyncStateBridge;
  channelOptions: SyncStateChannelOptions;
  stateRef: Ref<StateValue>;
  tracker: RemoteUpdateTracker<StateValue>;
  deep?: boolean;
}

const createStateWatcher = <StateValue>({
  bridge,
  channelOptions,
  deep,
  stateRef,
  tracker,
}: StateWatcherOptions<StateValue>): (() => void) =>
  watch(
    stateRef,
    (nextValue: StateValue) => {
      if (tracker.shouldSkipLocalSync(nextValue)) {
        return;
      }
      void bridge.set(channelOptions, resolveSyncValue(nextValue));
    },
    {
      deep: Boolean(deep),
      flush: "sync",
    },
  );

export interface SyncStateRef<StateValue> extends Ref<StateValue> {
  isSynced: Ref<boolean>;
}

export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: UseSyncStateOptions,
): SyncStateRef<StateValue> => {
  const stateRef = ref(initialValue) as unknown as SyncStateRef<StateValue>;
  const isSynced = ref(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);
  const tracker = createRemoteUpdateTracker(stateRef, isSynced);
  const stopWatcher = createStateWatcher({
    bridge,
    channelOptions,
    deep: options.deep,
    stateRef,
    tracker,
  });

  let unsubscribe: (() => void) | undefined = undefined;

  onMounted(() => {
    unsubscribe = bridge.subscribe(channelOptions, tracker.applyRemoteValue);
    void bridge.get<StateValue>(channelOptions).then(tracker.applyRemoteValue);
  });

  onBeforeUnmount(() => {
    stopWatcher();
    unsubscribe?.();
    unsubscribe = undefined;
  });

  stateRef.isSynced = isSynced;

  return stateRef;
};
