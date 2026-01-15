import { atom, type Getter, type PrimitiveAtom, type Setter } from "jotai";
import { useEffect, useMemo, useState } from "react";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface SyncStateJotaiOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

interface SyncedAtomWrapper<StateValue> {
  atom: PrimitiveAtom<StateValue>;
  // 保存基础 atom 的 setter，用于应用远程更新
  setAtom?: (value: StateValue) => void;
  // 记录订阅的清理函数，供外部释放
  unsubscribe?: () => void;
}

const createChannelOptions = (options: SyncStateJotaiOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

// Store synced atoms for cleanup
const syncedAtoms = new Map<string, SyncedAtomWrapper<unknown>>();

/**
 * Create a synced atom that synchronizes with Electron main process
 *
 * @example
 * ```typescript
 * import { syncStateAtom, useAtom } from 'electron-state-sync/jotai';
 *
 * const countAtom = syncStateAtom(0, { name: 'counter' });
 *
 * function App() {
 *   const [count, setCount] = useAtom(countAtom);
 *   return <div onClick={() => setCount(5)}>{count}</div>;
 * }
 * ```
 */
export const syncStateAtom = <StateValue>(
  initialValue: StateValue,
  options: SyncStateJotaiOptions,
): PrimitiveAtom<StateValue> => {
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);

  // Create wrapper to track sync state
  const baseAtom = atom(initialValue);
  const wrapper: SyncedAtomWrapper<StateValue> = {
    atom: baseAtom,
  };

  // Store for cleanup
  const atomKey = `${channelOptions.baseChannel}:${channelOptions.name}`;
  syncedAtoms.set(atomKey, wrapper as SyncedAtomWrapper<unknown>);

  // 待应用的远程值（atom 挂载前缓存）
  let pendingRemoteValue = initialValue;
  // 是否存在待处理的远程更新
  let hasPendingRemoteValue = false;

  // 应用主进程的远程更新
  const applyRemoteValue = (value: StateValue): void => {
    if (wrapper.setAtom) {
      wrapper.setAtom(value);
      return;
    }
    pendingRemoteValue = value;
    hasPendingRemoteValue = true;
  };

  // 基础 atom 挂载时，补发缓存的远程值
  baseAtom.onMount = (setAtom) => {
    wrapper.setAtom = setAtom;
    if (hasPendingRemoteValue) {
      setAtom(pendingRemoteValue);
      hasPendingRemoteValue = false;
    }
    return () => {
      wrapper.setAtom = undefined;
    };
  };

  // Subscribe to remote updates from main process
  const unsubscribe = bridge.subscribe<StateValue>(channelOptions, applyRemoteValue);
  wrapper.unsubscribe = unsubscribe;

  // Initialize from main process
  void bridge.get<StateValue>(channelOptions).then(applyRemoteValue);

  // Create read-write atom with sync logic
  const syncedAtom = atom(
    (get: Getter) => get(baseAtom),
    (get: Getter, set: Setter, value: StateValue | ((prev: StateValue) => StateValue)) => {
      const currentValue = get(baseAtom);
      const nextValue =
        typeof value === "function"
          ? (value as (prev: StateValue) => StateValue)(currentValue)
          : value;

      // Local update - sync to main process
      set(baseAtom, nextValue);
      void bridge.set(channelOptions, nextValue);
    },
  );

  return syncedAtom as PrimitiveAtom<StateValue>;
};

/**
 * Hook to access sync status for a synced atom
 *
 * @example
 * ```typescript
 * import { useSyncStateStatus } from 'electron-state-sync/jotai';
 *
 * function App() {
 *   const { isSynced } = useSyncStateStatus({ name: 'counter' });
 *   return isSynced ? <div>Synced</div> : <div>Loading...</div>;
 * }
 * ```
 */
export const useSyncStateStatus = (options: SyncStateJotaiOptions): { isSynced: boolean } => {
  const [isSynced, setIsSynced] = useState(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );

  useEffect(() => {
    void bridge.get(channelOptions).then(() => {
      setIsSynced(true);
    });
  }, [bridge, channelOptions]);

  return { isSynced };
};

/**
 * Cleanup function for synced atoms
 *
 * Call this when unmounting components to prevent memory leaks
 */
export const cleanupSyncedAtom = (options: SyncStateJotaiOptions): void => {
  const channelOptions = createChannelOptions(options);
  const atomKey = `${channelOptions.baseChannel}:${channelOptions.name}`;
  // 清理订阅避免内存泄漏
  const wrapper = syncedAtoms.get(atomKey);
  wrapper?.unsubscribe?.();
  syncedAtoms.delete(atomKey);
};
