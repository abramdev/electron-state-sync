import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface UseSyncStatePreactOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

export type UseSyncStatePreactResult<StateValue> = readonly [
  StateValue,
  (value: StateValue) => void,
  boolean,
];

const createChannelOptions = (options: UseSyncStatePreactOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: UseSyncStatePreactOptions,
): UseSyncStatePreactResult<StateValue> => {
  const [stateValue, setStateValue] = useState(initialValue);
  const [isSynced, setIsSynced] = useState(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );

  const applyRemoteValue = useCallback((value: StateValue): void => {
    setStateValue(value);
    setIsSynced(true);
  }, []);

  const setAndSync = useCallback(
    (value: StateValue): void => {
      setStateValue(value);
      void bridge.set(channelOptions, value);
    },
    [bridge, channelOptions],
  );

  useEffect(() => {
    const unsubscribe = bridge.subscribe(channelOptions, applyRemoteValue);
    void bridge.get<StateValue>(channelOptions).then(applyRemoteValue);

    return () => {
      unsubscribe();
    };
  }, [applyRemoteValue, bridge, channelOptions]);

  return [stateValue, setAndSync, isSynced] as const;
};

// Backward compatibility alias
export { useSyncState as useSyncStatePreact };
