import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from "electron";

import {
  createSyncStateChannels,
  type SyncStateChannelOptions,
  type SyncStateChannels,
} from "./channels";
import { SyncStateError } from "./types";

export interface SyncStateMainGlobalConfig {
  baseChannel?: string;
  allowRendererSet?: boolean;
}

let globalConfig: SyncStateMainGlobalConfig = {};

export const initSyncStateMain = (config: SyncStateMainGlobalConfig): void => {
  globalConfig = { ...config };
};

export interface SyncStateMainOptions<StateValue> extends SyncStateChannelOptions {
  initialValue: StateValue;
  allowRendererSet?: boolean;
  resolveRendererValue?: (value: StateValue) => StateValue;
}

export interface SyncStateMainHandle<StateValue> {
  get: () => StateValue;
  set: (value: StateValue) => void;
  dispose: () => void;
}

interface SyncStateStore<StateValue> {
  getState: () => StateValue;
  setState: (value: StateValue) => void;
}

interface SyncStateSubscriptions<StateValue> {
  broadcast: (value: StateValue) => void;
  clear: () => void;
  handleSubscribe: (event: IpcMainEvent) => void;
  handleUnsubscribe: (event: IpcMainEvent) => void;
}

interface SyncStateInvokeHandlers<StateValue> {
  handleGet: () => StateValue;
  handleSet: (_event: IpcMainInvokeEvent, value: StateValue) => void;
}

const createReadonlyErrorMessage = (stateName: string, baseChannel: string): string =>
  `syncState renderer write is disabled by main process. State "${stateName}" has channel prefix "${baseChannel}". Please set allowRendererSet: true in main process to enable renderer write.`;

const createInvalidValueErrorMessage = (stateName: string, baseChannel: string): string =>
  `syncState renderer write value validation failed. State "${stateName}" has channel prefix "${baseChannel}". Please check if the value conforms to resolveRendererValue validation rules.`;

const INVALID_INITIAL_VALUE_WARNING_MESSAGE =
  "syncState Warning: Initial value contains non-serializable content (such as functions, Symbols, BigInts, etc.), which will prevent the value from being transmitted to renderer process via IPC";

const checkType = (val: unknown): boolean => {
  if (val === null || val === undefined) {
    return true;
  }
  if (typeof val === "string") {
    return true;
  }
  if (typeof val === "number") {
    return true;
  }
  if (typeof val === "boolean") {
    return true;
  }
  if (typeof val === "function") {
    return false;
  }
  if (typeof val === "symbol") {
    return false;
  }
  if (typeof val === "bigint") {
    return false;
  }

  if (Array.isArray(val)) {
    return val.every((item) => checkType(item));
  }

  if (typeof val === "object") {
    try {
      JSON.stringify(val);
      return Object.values(val).every((item) => checkType(item));
    } catch {
      return false;
    }
  }

  return true;
};

const validateSerializable = (value: unknown): boolean => checkType(value);

const createSyncStateStore = <StateValue>(initialValue: StateValue): SyncStateStore<StateValue> => {
  let state = initialValue;

  const getState = (): StateValue => state;

  const setState = (value: StateValue): void => {
    state = value;
  };

  return {
    getState,
    setState,
  };
};

const createSubscriptions = <StateValue>(
  channels: SyncStateChannels,
  getState: () => StateValue,
): SyncStateSubscriptions<StateValue> => {
  const subscribers = new Set<WebContents>();

  const broadcast = (value: StateValue): void => {
    for (const subscriber of subscribers) {
      if (subscriber.isDestroyed()) {
        subscribers.delete(subscriber);
      } else {
        subscriber.send(channels.updateChannel, value);
      }
    }
  };

  const handleSubscribe = ({ sender }: IpcMainEvent): void => {
    subscribers.add(sender);
    sender.once("destroyed", () => {
      subscribers.delete(sender);
    });
    sender.send(channels.updateChannel, getState());
  };

  const handleUnsubscribe = ({ sender }: IpcMainEvent): void => {
    subscribers.delete(sender);
  };

  const clear = (): void => {
    subscribers.clear();
  };

  return {
    broadcast,
    clear,
    handleSubscribe,
    handleUnsubscribe,
  };
};

const createSetStateAndBroadcast =
  <StateValue>(
    setState: (value: StateValue) => void,
    broadcast: (value: StateValue) => void,
  ): ((value: StateValue) => void) =>
  (value: StateValue): void => {
    setState(value);
    broadcast(value);
  };

const createInvokeHandlers = <StateValue>(
  getState: () => StateValue,
  setStateAndBroadcast: (value: StateValue) => void,
  options: SyncStateMainOptions<StateValue>,
): SyncStateInvokeHandlers<StateValue> => {
  const handleGet = (): StateValue => getState();

  const ensureRendererWritable = (): void => {
    if (options.allowRendererSet === false) {
      throw new SyncStateError(
        "RENDERER_READONLY",
        createReadonlyErrorMessage(options.name, options.baseChannel ?? "state"),
        {
          baseChannel: options.baseChannel ?? "state",
          stateName: options.name,
        },
      );
    }
  };

  const resolveRendererValue = (value: StateValue): StateValue => {
    if (!options.resolveRendererValue) {
      return value;
    }

    try {
      return options.resolveRendererValue(value);
    } catch (error) {
      let message = "";
      let cause: Error | undefined = undefined;
      if (error instanceof Error) {
        const { message: errorMessage } = error;
        message = errorMessage;
        cause = error;
      } else {
        message = createInvalidValueErrorMessage(options.name, options.baseChannel ?? "state");
      }

      throw new SyncStateError("RENDERER_INVALID_VALUE", message, {
        baseChannel: options.baseChannel ?? "state",
        cause,
        stateName: options.name,
      });
    }
  };

  const handleSet = (_event: IpcMainInvokeEvent, value: StateValue): void => {
    ensureRendererWritable();
    const resolvedValue = resolveRendererValue(value);
    setStateAndBroadcast(resolvedValue);
  };

  return {
    handleGet,
    handleSet,
  };
};

const registerIpcHandlers = <StateValue>(
  channels: SyncStateChannels,
  invokeHandlers: SyncStateInvokeHandlers<StateValue>,
  subscriptions: SyncStateSubscriptions<StateValue>,
): (() => void) => {
  ipcMain.handle(channels.getChannel, invokeHandlers.handleGet);
  ipcMain.handle(channels.setChannel, invokeHandlers.handleSet);
  ipcMain.on(channels.subscribeChannel, subscriptions.handleSubscribe);
  ipcMain.on(channels.unsubscribeChannel, subscriptions.handleUnsubscribe);

  return (): void => {
    ipcMain.removeHandler(channels.getChannel);
    ipcMain.removeHandler(channels.setChannel);
    ipcMain.removeListener(channels.subscribeChannel, subscriptions.handleSubscribe);
    ipcMain.removeListener(channels.unsubscribeChannel, subscriptions.handleUnsubscribe);
    subscriptions.clear();
  };
};

export const state = <StateValue>(
  options: SyncStateMainOptions<StateValue>,
): SyncStateMainHandle<StateValue> => {
  const mergedOptions: SyncStateMainOptions<StateValue> = {
    allowRendererSet: globalConfig.allowRendererSet,
    baseChannel: globalConfig.baseChannel,
    ...options,
  };

  if (!validateSerializable(mergedOptions.initialValue)) {
    console.warn(`${INVALID_INITIAL_VALUE_WARNING_MESSAGE}\n  State name: "${mergedOptions.name}"`);
  }

  const channels = createSyncStateChannels(mergedOptions);
  const store = createSyncStateStore(mergedOptions.initialValue);
  const subscriptions = createSubscriptions(channels, store.getState);
  const setStateAndBroadcast = createSetStateAndBroadcast(store.setState, subscriptions.broadcast);
  const invokeHandlers = createInvokeHandlers(store.getState, setStateAndBroadcast, mergedOptions);

  const dispose = registerIpcHandlers(channels, invokeHandlers, subscriptions);

  return {
    dispose,
    get: store.getState,
    set: setStateAndBroadcast,
  };
};
