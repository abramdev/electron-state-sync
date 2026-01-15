import { useEffect, useMemo, useState } from "react";

import type { Middleware, UnknownAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface SyncStateReduxOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
  selector?: (state: unknown) => unknown;
  actionType?: string;
}

const createChannelOptions = (options: SyncStateReduxOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

// Track remote updates per store
const storeRemoteUpdates = new WeakMap<object, boolean>();

// Store references to stores keyed by channel key, so useSyncState can access them
const channelStores = new Map<string, object>();

// 标记需要跳过中间件同步的 action 元信息
interface SyncStateActionMeta {
  syncState?: {
    skipSync?: boolean;
  };
}

// 同步 action 的结构定义
interface SyncStateAction<StateValue> extends UnknownAction {
  payload: StateValue;
  meta: SyncStateActionMeta;
}

// 检查 action 是否需要跳过同步
const shouldSkipSyncAction = (action: UnknownAction): boolean => {
  const { meta } = action as { meta?: SyncStateActionMeta };
  return Boolean(meta?.syncState?.skipSync);
};

/**
 * Redux middleware for syncing state with Electron main process
 *
 * @example
 * ```typescript
 * import { configureStore } from '@reduxjs/toolkit';
 * import { syncStateMiddleware } from 'electron-state-sync/redux';
 *
 * const store = configureStore({
 *   reducer: { counter: counterReducer },
 *   middleware: (getDefaultMiddleware) =>
 *     getDefaultMiddleware().concat(
 *       syncStateMiddleware({
 *         name: 'counter',
 *         selector: (state) => state.counter.value
 *       })
 *     )
 * });
 * ```
 */
export const syncStateMiddleware = (
  options: SyncStateReduxOptions,
): Middleware<object, any, never> => {
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);

  return (storeAPI) => (next) => (action) => {
    // Store reference to this store for useSyncState to access
    const channelKey = `${channelOptions.baseChannel}:${channelOptions.name}`;
    channelStores.set(channelKey, storeAPI);
    const result = next(action);
    const nextState = storeAPI.getState();

    // Check if applying remote update
    const isRemote = storeRemoteUpdates.get(storeAPI);
    if (isRemote) {
      storeRemoteUpdates.set(storeAPI, false);
      return result;
    }

    // 如果 action 已经触发同步，跳过重复发送
    if (shouldSkipSyncAction(action as UnknownAction)) {
      return result;
    }

    // Select state to sync
    const selectedState = options.selector ? options.selector(nextState) : nextState;

    // Local update - sync to main process
    void bridge.set(channelOptions, selectedState as unknown);

    return result;
  };
};

/**
 * Hook for accessing synced state in React components
 *
 * @example
 * ```typescript
 * import { useSyncState } from 'electron-state-sync/redux';
 *
 * function App() {
 *   const { state: count, isSynced } = useSyncState<number>({
 *     name: 'counter',
 *     selector: (state) => state.counter.value
 *   });
 *
 *   return <div>{count}</div>;
 * }
 * ```
 */
export const useSyncState = <StateValue>(
  options: SyncStateReduxOptions,
): { state: StateValue; isSynced: boolean } => {
  const [isSynced, setIsSynced] = useState(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );
  const actionType = useMemo(
    () => options.actionType || `${channelOptions.baseChannel}/${channelOptions.name}/set`,
    [options.actionType, channelOptions.baseChannel, channelOptions.name],
  );

  // Select state from Redux store
  const state = useSelector((state: unknown) =>
    options.selector ? (options.selector(state) as StateValue) : (state as StateValue),
  );

  // Subscribe to remote updates
  const dispatch = useDispatch();
  useEffect(() => {
    const channelKey = `${channelOptions.baseChannel}:${channelOptions.name}`;
    const unsubscribe = bridge.subscribe<StateValue>(channelOptions, (value) => {
      // Mark as remote update by setting the flag before dispatching
      const store = channelStores.get(channelKey);
      if (store) {
        storeRemoteUpdates.set(store, true);
      }
      dispatch({
        payload: value,
        type: actionType,
      } as UnknownAction);
    });

    void bridge.get<StateValue>(channelOptions).then(() => {
      setIsSynced(true);
    });

    return () => {
      unsubscribe();
    };
  }, [bridge, channelOptions, dispatch, actionType]);

  return { isSynced, state };
};

export { useSyncState as useReduxSyncState };

/**
 * Hook to create an action creator that syncs with main process
 *
 * @example
 * ```typescript
 * import { createSyncActionCreator } from 'electron-state-sync/redux';
 *
 * const setCount = createSyncActionCreator<number>('counter/set', {
 *   name: 'counter'
 * });
 *
 * // In component
 * const dispatch = useDispatch();
 * dispatch(setCount(42));
 * ```
 */
export const createSyncActionCreator = <StateValue>(
  actionType: string,
  options: SyncStateReduxOptions,
): ((value: StateValue) => SyncStateAction<StateValue>) => {
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);

  return (value: StateValue) => {
    void bridge.set(channelOptions, value);
    return {
      // 标记为已同步，避免中间件重复发送
      meta: {
        syncState: {
          skipSync: true,
        },
      },
      payload: value,
      type: actionType,
    };
  };
};
