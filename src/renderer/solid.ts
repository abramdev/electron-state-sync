import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface UseSyncStateSolidOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

// Solid Setter type
export type SyncStateSolidSetter<StateValue> = (
  value: StateValue | ((prev: StateValue) => StateValue),
) => StateValue;

// Solid Hook return type
export type UseSyncStateSolidResult<StateValue> = readonly [
  Accessor<StateValue>,
  SyncStateSolidSetter<StateValue>,
  Accessor<boolean>,
];

// Remote update tracker
interface RemoteUpdateTracker<StateValue> {
  // Apply main process update
  applyRemoteValue: (value: StateValue) => void;
  // Check if should skip local sync
  shouldSkipLocalSync: () => boolean;
}

const createChannelOptions = (options: UseSyncStateSolidOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

const createRemoteUpdateTracker = <StateValue>(
  setState: (value: StateValue) => StateValue,
  setIsSynced: (value: boolean) => void,
): RemoteUpdateTracker<StateValue> => {
  // Whether update is from main process
  let isRemoteUpdate = false;

  const applyRemoteValue = (value: StateValue): void => {
    isRemoteUpdate = true;
    setState(value);
    // Mark first sync as completed
    setIsSynced(true);
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

// Sync Setter options
interface SyncSetterOptions<StateValue> {
  accessor: Accessor<StateValue>;
  setState: (value: StateValue) => StateValue;
  bridge: SyncStateBridge;
  channelOptions: SyncStateChannelOptions;
  tracker: RemoteUpdateTracker<StateValue>;
}

const createSyncSetter =
  <StateValue>(options: SyncSetterOptions<StateValue>): SyncStateSolidSetter<StateValue> =>
  (value: StateValue | ((prev: StateValue) => StateValue)) => {
    const { accessor, bridge, channelOptions, setState, tracker } = options;
    let nextValue = value as StateValue;

    if (typeof value === "function") {
      nextValue = (value as (prev: StateValue) => StateValue)(accessor());
    }

    if (tracker.shouldSkipLocalSync()) {
      return setState(nextValue);
    }

    const resultValue = setState(nextValue);
    void bridge.set(channelOptions, nextValue);
    return resultValue;
  };

export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: UseSyncStateSolidOptions,
): UseSyncStateSolidResult<StateValue> => {
  const [rawStateValue, rawSetStateValue] = createSignal<StateValue>(initialValue as StateValue);
  const stateValue = rawStateValue as Accessor<StateValue>;
  // First sync completion flag
  const [isSynced, setIsSynced] = createSignal(false);
  const setStateValue = (value: StateValue): StateValue => {
    (rawSetStateValue as (nextValue: StateValue) => void)(value);
    return value;
  };
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);
  const tracker = createRemoteUpdateTracker(setStateValue, setIsSynced);
  const setAndSync = createSyncSetter<StateValue>({
    accessor: stateValue,
    bridge,
    channelOptions,
    setState: setStateValue,
    tracker,
  });

  onMount(() => {
    const unsubscribe = bridge.subscribe(channelOptions, tracker.applyRemoteValue);
    void bridge.get<StateValue>(channelOptions).then(tracker.applyRemoteValue);

    onCleanup(() => {
      unsubscribe();
    });
  });

  return [stateValue, setAndSync, isSynced] as const;
};

// Backward compatibility alias
export { useSyncState as useSyncStateSolid };
