import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";

import type { SyncStateChannelOptions } from "../channels";
import type { SyncStateBridge } from "../types";
import { resolveSyncStateBridge } from "./bridge";
import { getGlobalConfig } from "./index";

export interface UseSyncStateSolidOptions extends SyncStateChannelOptions {
  bridge?: SyncStateBridge;
}

// Solid Setter 类型
export type SyncStateSolidSetter<StateValue> = (
  value: StateValue | ((prev: StateValue) => StateValue),
) => StateValue;

// Solid Hook 返回值
export type UseSyncStateSolidResult<StateValue> = readonly [
  // 当前状态读取函数
  Accessor<StateValue>,
  // 设置并同步状态
  SyncStateSolidSetter<StateValue>,
  // 是否已完成首次同步
  Accessor<boolean>,
];

// 远端更新标记
interface RemoteUpdateTracker<StateValue> {
  // 应用主进程更新
  applyRemoteValue: (value: StateValue) => void;
  // 判断是否跳过本地同步
  shouldSkipLocalSync: () => boolean;
}

// 创建 IPC 通道参数
const createChannelOptions = (options: UseSyncStateSolidOptions): SyncStateChannelOptions => {
  // 合并全局配置（局部配置优先）
  const globalConfig = getGlobalConfig();
  return {
    baseChannel: options.baseChannel ?? globalConfig.baseChannel,
    name: options.name,
  };
};

// 创建远端更新跟踪器
const createRemoteUpdateTracker = <StateValue>(
  setState: (value: StateValue) => StateValue,
  setIsSynced: (value: boolean) => void,
): RemoteUpdateTracker<StateValue> => {
  // 是否来自主进程的更新
  let isRemoteUpdate = false;

  const applyRemoteValue = (value: StateValue): void => {
    isRemoteUpdate = true;
    setState(value);
    // 标记已完成首次同步
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

// 同步 Setter 参数
interface SyncSetterOptions<StateValue> {
  // 读取当前状态
  accessor: Accessor<StateValue>;
  // 写入当前状态
  setState: (value: StateValue) => StateValue;
  // 同步桥接
  bridge: SyncStateBridge;
  // IPC 通道选项
  channelOptions: SyncStateChannelOptions;
  // 远端更新跟踪器
  tracker: RemoteUpdateTracker<StateValue>;
}

// 创建同步 Setter
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

// Solid 版本同步状态 Hook
export const useSyncState = <StateValue>(
  initialValue: StateValue,
  options: UseSyncStateSolidOptions,
): UseSyncStateSolidResult<StateValue> => {
  const [rawStateValue, rawSetStateValue] = createSignal<StateValue>(initialValue as StateValue);
  const stateValue = rawStateValue as Accessor<StateValue>;
  // 首次同步完成标记
  const [isSynced, setIsSynced] = createSignal(false);
  const setStateValue = (value: StateValue): StateValue => {
    (rawSetStateValue as (nextValue: StateValue) => void)(value);
    return value;
  };
  // 合并全局配置（局部 bridge 优先）
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
