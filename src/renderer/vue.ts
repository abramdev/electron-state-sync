import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

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
  shouldSkipLocalSync: () => boolean;
}

const createChannelOptions = (options: UseSyncStateOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

const createRemoteUpdateTracker = <StateValue>(
  stateRef: Ref<StateValue>,
  isSynced: Ref<boolean>,
): RemoteUpdateTracker<StateValue> => {
  let isRemoteUpdate = false;

  const applyRemoteValue = (value: StateValue): void => {
    isRemoteUpdate = true;
    stateRef.value = value;
    isSynced.value = true;
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
      if (tracker.shouldSkipLocalSync()) {
        return;
      }
      void bridge.set(channelOptions, nextValue);
    },
    { deep: Boolean(deep) },
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
