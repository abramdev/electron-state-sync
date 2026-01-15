import { useEffect, useMemo, useState } from "react";

import type { GetState, SetState, StateCreator, StoreApi } from "zustand";
import { createStore } from "zustand/vanilla";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface SyncStateZustandOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

const createChannelOptions = (options: SyncStateZustandOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

/**
 * Zustand middleware that syncs store state with Electron main process
 *
 * @example
 * ```typescript
 * import { create } from 'zustand';
 * import { syncStateMiddleware } from 'electron-state-sync/zustand';
 *
 * const useStore = create(
 *   syncStateMiddleware({ name: 'counter' })((set) => ({
 *     count: 0,
 *     increment: () => set((state) => ({ count: state.count + 1 }))
 *   }))
 * );
 * ```
 */
export const syncStateMiddleware =
  <State extends Record<string, unknown>>(options: SyncStateZustandOptions) =>
  (config: StateCreator<State>) =>
  (set: SetState<State>, get: GetState<State>, api: StoreApi<State>): State => {
    const globalConfig = getGlobalConfig();
    const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
    const channelOptions = createChannelOptions(options);

    // Track remote updates to prevent infinite loops
    let isApplyingRemoteValue = false;

    // Wrap setState to intercept local updates
    const originalSetState = api.setState;
    api.setState = (
      partial: Partial<State> | ((state: State) => Partial<State>),
      replace?: boolean,
    ) => {
      const currentState = get();

      // Check if this is a remote update
      if (isApplyingRemoteValue) {
        isApplyingRemoteValue = false;
        return originalSetState(partial, replace);
      }

      // Local update - sync to main process
      let nextState: State;
      if (typeof partial === "function") {
        nextState = (partial as (state: State) => State)(currentState);
      } else if (replace) {
        nextState = partial as State;
      } else {
        nextState = { ...currentState, ...partial } as State;
      }

      // Extract only data properties (exclude functions) for syncing to main process
      const dataOnlyState = Object.fromEntries(
        Object.entries(nextState as Record<string, unknown>).filter(
          ([_, v]) => typeof v !== "function",
        ),
      ) as State;

      void bridge.set(channelOptions, dataOnlyState);
      return originalSetState(partial, replace);
    };

    // 使用包装后的 setState 应用远程更新
    const applyRemoteValue = (value: State): void => {
      isApplyingRemoteValue = true;
      // If value is a primitive or the store state has nested structure,
      // merge it appropriately to preserve actions
      const currentState = get();
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Value is an object, merge it
        api.setState({ ...currentState, ...value } as State, true);
      } else {
        // Value is a primitive, assume it should be nested under a property
        // Try to infer the property name from current state structure
        const keys = Object.keys(currentState as Record<string, unknown>).filter(
          (k) => typeof (currentState as Record<string, unknown>)[k] !== "function",
        );
        if (keys.length === 1) {
          api.setState({ ...currentState, [keys[0]]: value } as State, true);
        } else {
          // Fallback: replace with value
          api.setState(value as Partial<State>, true);
        }
      }
    };

    // Subscribe to remote updates from main process
    const unsubscribe = bridge.subscribe<State>(channelOptions, applyRemoteValue);

    // Initialize from main process
    void bridge.get<State>(channelOptions).then(applyRemoteValue);

    // Create the store with the enhanced setState
    const store = config(set, get, api);

    // Cleanup on store destruction (if supported)
    const storeApi = api as unknown as StoreApi<State> & {
      destroy?: () => void;
    };
    if (storeApi.destroy) {
      const originalDestroy = storeApi.destroy;
      storeApi.destroy = () => {
        unsubscribe();
        originalDestroy();
      };
    }

    return store;
  };

/**
 * Hook to access sync state for a Zustand store
 *
 * @example
 * ```typescript
 * import { useSyncState } from 'electron-state-sync/zustand';
 *
 * function App() {
 *   const { state, isSynced } = useSyncState({ name: 'counter' });
 *   return <div>{state?.count}</div>;
 * }
 * ```
 */
export const useSyncState = <State extends Record<string, unknown>>(
  options: SyncStateZustandOptions,
): { state: State | undefined; isSynced: boolean } => {
  const [isSynced, setIsSynced] = useState(false);
  const [state, setState] = useState<State | undefined>();

  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );

  useEffect(() => {
    const unsubscribe = bridge.subscribe<State>(channelOptions, (value) => {
      setState(value);
      setIsSynced(true);
    });

    void bridge.get<State>(channelOptions).then((value) => {
      setState(value);
      setIsSynced(true);
    });

    return () => {
      unsubscribe();
    };
  }, [bridge, channelOptions]);

  return { isSynced, state };
};

export { useSyncState as useZustandSyncState };

/**
 * Create a synced Zustand store (hook-less version for vanilla JS)
 *
 * @example
 * ```typescript
 * import { createSyncedStore } from 'electron-state-sync/zustand';
 *
 * const store = createSyncedStore(
 *   { count: 0 },
 *   { name: 'counter' },
 *   (set) => ({
 *     increment: () => set((state) => ({ count: state.count + 1 }))
 *   })
 * );
 * ```
 */
export const createSyncedStore = <State extends Record<string, unknown>>(
  initialState: State,
  options: SyncStateZustandOptions,
): StoreApi<State> => {
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = createChannelOptions(options);

  // Track remote updates to prevent infinite loops
  let isApplyingRemoteValue = false;

  const store = createStore<State>()(() => initialState);

  // Wrap setState to intercept local updates
  const originalSetState = store.setState.bind(store);
  store.setState = (partial: Partial<State> | ((state: State) => State), replace?: boolean) => {
    const currentState = store.getState();

    // Check if this is a remote update
    if (isApplyingRemoteValue) {
      isApplyingRemoteValue = false;
      return originalSetState(partial, replace);
    }

    // Local update - sync to main process
    let nextState: State;
    if (typeof partial === "function") {
      nextState = (partial as (state: State) => State)(currentState);
    } else if (replace) {
      nextState = partial as State;
    } else {
      nextState = { ...currentState, ...partial } as State;
    }

    // Extract only data properties (exclude functions) for syncing to main process
    const dataOnlyState = Object.fromEntries(
      Object.entries(nextState as Record<string, unknown>).filter(
        ([_, v]) => typeof v !== "function",
      ),
    ) as State;

    void bridge.set(channelOptions, dataOnlyState);
    return originalSetState(partial, replace);
  };

  // 使用包装后的 setState 应用远程更新
  const applyRemoteValue = (value: State): void => {
    isApplyingRemoteValue = true;
    // If value is a primitive or the store state has nested structure,
    // merge it appropriately to preserve actions
    const currentState = store.getState();
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Value is an object, merge it
      store.setState({ ...currentState, ...value } as State);
    } else {
      // Value is a primitive, assume it should be nested under a property
      // Try to infer the property name from current state structure
      const keys = Object.keys(currentState as Record<string, unknown>).filter(
        (k) => typeof (currentState as Record<string, unknown>)[k] !== "function",
      );
      if (keys.length === 1) {
        store.setState({ ...currentState, [keys[0]]: value } as State);
      } else {
        // Fallback: replace with value
        store.setState(value as Partial<State>);
      }
    }
  };

  // Subscribe to remote updates from main process
  const unsubscribe = bridge.subscribe<State>(channelOptions, applyRemoteValue);

  // Initialize from main process
  void bridge.get<State>(channelOptions).then(applyRemoteValue);

  // Store unsubscribe for cleanup
  const storeWithCleanup = store as unknown as { destroy?: () => void };
  if (storeWithCleanup.destroy) {
    const originalDestroy = storeWithCleanup.destroy;
    storeWithCleanup.destroy = () => {
      unsubscribe();
      originalDestroy();
    };
  } else {
    storeWithCleanup.destroy = () => {
      unsubscribe();
    };
  }

  return store;
};
