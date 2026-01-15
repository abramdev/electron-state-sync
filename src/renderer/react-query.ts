import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

// Default query timings
const DEFAULT_STALE_TIME = 1000;
const DEFAULT_GC_TIME = 300_000;

export interface SyncStateQueryOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
  staleTime?: number;
  gcTime?: number;
  queryKey?: unknown[];
}

const createChannelOptions = (options: SyncStateQueryOptions): SyncStateChannelOptions => {
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

/**
 * Hook for syncing state with TanStack Query
 *
 * Provides a query-based interface to sync state between renderer and main process.
 * Automatically refetches when remote changes occur.
 *
 * @example
 * ```typescript
 * import { useSyncState } from 'electron-state-sync/react-query';
 *
 * function App() {
 *   const { data: count, isSynced, update } = useSyncState(0, {
 *     name: 'counter'
 *   });
 *
 *   return <div onClick={() => update(5)}>{count}</div>;
 * }
 * ```
 */
export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: SyncStateQueryOptions,
): {
  data: StateValue;
  isSynced: boolean;
  update: (value: StateValue) => void;
} => {
  const [isSynced, setIsSynced] = useState(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );

  // Query for fetching state from main process
  const query = useQuery({
    gcTime: options.gcTime ?? DEFAULT_GC_TIME,
    queryFn: () => bridge.get<StateValue>(channelOptions),
    queryKey: options.queryKey ?? ["sync-state", channelOptions.baseChannel, channelOptions.name],
    refetchOnWindowFocus: false,
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
  });

  // Mutation for updating state
  const mutation = useMutation({
    mutationFn: (value: StateValue) => bridge.set(channelOptions, value),
  });

  // Subscribe to remote updates and refetch query
  useEffect(() => {
    const unsubscribe = bridge.subscribe<StateValue>(channelOptions, () => {
      query.refetch();
    });

    return () => {
      unsubscribe();
    };
  }, [bridge, channelOptions, query]);

  // Check sync status on mount
  useEffect(() => {
    if (!query.isLoading && !query.isFetching) {
      setIsSynced(true);
    }
  }, [query.isLoading, query.isFetching]);

  // Update function that mutates state
  const update = useCallback(
    (value: StateValue) => {
      mutation.mutate(value);
    },
    [mutation],
  );

  return {
    data: query.data ?? initialValue,
    isSynced,
    update,
  };
};

/**
 * Hook for creating a mutation to update synced state
 *
 * Provides a simpler mutation-only interface for updating state.
 *
 * @example
 * ```typescript
 * import { useSyncMutation } from 'electron-state-sync/react-query';
 *
 * function App() {
 *   const { mutate, isSynced } = useSyncMutation<number>({
 *     name: 'counter'
 *   });
 *
 *   return <button onClick={() => mutate(10)}>Set to 10</button>;
 * }
 * ```
 */
export const useSyncMutation = <StateValue>(
  options: SyncStateQueryOptions,
): { mutate: (value: StateValue) => void; isSynced: boolean } => {
  const [isSynced, setIsSynced] = useState(false);
  const globalConfig = getGlobalConfig();
  const bridge = resolveSyncStateBridge(options.bridge ?? globalConfig.bridge);
  const channelOptions = useMemo(
    () => createChannelOptions(options),
    [options.baseChannel, options.name],
  );

  // Check if synced on mount
  useEffect(() => {
    void bridge.get<StateValue>(channelOptions).then(() => {
      setIsSynced(true);
    });
  }, [bridge, channelOptions]);

  const mutation = useMutation({
    mutationFn: (value: StateValue) => bridge.set(channelOptions, value),
  });

  return {
    isSynced,
    mutate: (value: StateValue) => mutation.mutate(value),
  };
};

export { useSyncState as useQuerySyncState };
