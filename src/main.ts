import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from "electron";

import {
  createSyncStateChannels,
  type SyncStateChannelOptions,
  type SyncStateChannels,
} from "./channels";
import { SyncStateError } from "./types";

// Global configuration interface
export interface SyncStateMainGlobalConfig {
  // Base channel prefix (default: "state")
  baseChannel?: string;
  // Allow renderer process to write (default: true)
  allowRendererSet?: boolean;
}

// Global configuration storage (closure)
let globalConfig: SyncStateMainGlobalConfig = {};

// Initialize global configuration
export const initSyncStateMain = (config: SyncStateMainGlobalConfig): void => {
  globalConfig = { ...config };
};

// Main process sync configuration
export interface SyncStateMainOptions<StateValue> extends SyncStateChannelOptions {
  // Initial value for the state
  initialValue: StateValue;
  // Whether to allow renderer process to write
  allowRendererSet?: boolean;
  // Validation or transformation for renderer process writes
  resolveRendererValue?: (value: StateValue) => StateValue;
}

// Main process sync instance
export interface SyncStateMainHandle<StateValue> {
  // Get current value
  get: () => StateValue;
  // Set value and broadcast
  set: (value: StateValue) => void;
  // Dispose all listeners
  dispose: () => void;
}

// Main process state read and write
interface SyncStateStore<StateValue> {
  // Get current value
  getState: () => StateValue;
  // Set current value
  setState: (value: StateValue) => void;
}

// Subscription handlers
interface SyncStateSubscriptions<StateValue> {
  // Broadcast updates
  broadcast: (value: StateValue) => void;
  // Clear subscriptions
  clear: () => void;
  // Handle subscription request
  handleSubscribe: (event: IpcMainEvent) => void;
  // Handle unsubscription
  handleUnsubscribe: (event: IpcMainEvent) => void;
}

// IPC invoke handlers
interface SyncStateInvokeHandlers<StateValue> {
  // Get value
  handleGet: () => StateValue;
  // Set value
  handleSet: (_event: IpcMainInvokeEvent, value: StateValue) => void;
}

// Renderer readonly error message
const createReadonlyErrorMessage = (stateName: string, baseChannel: string): string =>
  `syncState renderer write is disabled by main process. State "${stateName}" has channel prefix "${baseChannel}". Please set allowRendererSet: true in main process to enable renderer write.`;

// Renderer value validation error message
const createInvalidValueErrorMessage = (stateName: string, baseChannel: string): string =>
  `syncState renderer write value validation failed. State "${stateName}" has channel prefix "${baseChannel}". Please check if the value conforms to resolveRendererValue validation rules.`;

// Initial value non-serializable warning message
const INVALID_INITIAL_VALUE_WARNING_MESSAGE =
  "syncState Warning: Initial value contains non-serializable content (such as functions, Symbols, BigInts, etc.), which will prevent the value from being transmitted to renderer process via IPC";

// Validate whether value can be JSON serialized
const validateSerializable = (value: unknown): boolean => {
  // Check if value type is serializable
  const checkType = (val: unknown): boolean => {
    if (val === null || val === undefined) return true;
    if (typeof val === "string") return true;
    if (typeof val === "number") return true;
    if (typeof val === "boolean") return true;
    if (typeof val === "function") return false;
    if (typeof val === "symbol") return false;
    if (typeof val === "bigint") return false;

    if (Array.isArray(val)) {
      return val.every(checkType);
    }

    if (typeof val === "object") {
      try {
        // Check for circular references
        JSON.stringify(val);
        // Recursively check all properties
        return Object.values(val).every(checkType);
      } catch {
        return false;
      }
    }

    return true;
  };

  return checkType(value);
};

// Create main process state store
const createSyncStateStore = <StateValue>(initialValue: StateValue): SyncStateStore<StateValue> => {
  // Use closure to store state
  let state = initialValue;

  // Get current value
  const getState = (): StateValue => state;

  // Set current value
  const setState = (value: StateValue): void => {
    state = value;
  };

  return {
    getState,
    setState,
  };
};

// Create subscription manager
const createSubscriptions = <StateValue>(
  channels: SyncStateChannels,
  getState: () => StateValue,
): SyncStateSubscriptions<StateValue> => {
  // Currently subscribed renderer processes
  const subscribers = new Set<WebContents>();

  // Broadcast updates
  const broadcast = (value: StateValue): void => {
    for (const subscriber of subscribers) {
      if (subscriber.isDestroyed()) {
        subscribers.delete(subscriber);
      } else {
        subscriber.send(channels.updateChannel, value);
      }
    }
  };

  // Handle subscription request
  const handleSubscribe = ({ sender }: IpcMainEvent): void => {
    subscribers.add(sender);
    sender.once("destroyed", () => {
      subscribers.delete(sender);
    });
    sender.send(channels.updateChannel, getState());
  };

  // Handle unsubscription
  const handleUnsubscribe = ({ sender }: IpcMainEvent): void => {
    subscribers.delete(sender);
  };

  // Clear subscriptions
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

// Create write and broadcast logic
const createSetStateAndBroadcast =
  <StateValue>(
    setState: (value: StateValue) => void,
    broadcast: (value: StateValue) => void,
  ): ((value: StateValue) => void) =>
  (value: StateValue): void => {
    setState(value);
    broadcast(value);
  };

// Create IPC invoke handlers
const createInvokeHandlers = <StateValue>(
  getState: () => StateValue,
  setStateAndBroadcast: (value: StateValue) => void,
  options: SyncStateMainOptions<StateValue>,
): SyncStateInvokeHandlers<StateValue> => {
  // IPC get handler
  const handleGet = (): StateValue => getState();

  // Check if renderer is allowed to write
  const ensureRendererWritable = (): void => {
    if (options.allowRendererSet === false) {
      throw new SyncStateError(
        "RENDERER_READONLY",
        createReadonlyErrorMessage(options.name, options.baseChannel ?? "state"),
        {
          stateName: options.name,
          baseChannel: options.baseChannel ?? "state",
        },
      );
    }
  };

  // Validate and transform renderer write value
  const resolveRendererValue = (value: StateValue): StateValue => {
    if (!options.resolveRendererValue) {
      return value;
    }

    try {
      return options.resolveRendererValue(value);
    } catch (error) {
      // Error message when validation fails
      const message =
        error instanceof Error
          ? error.message
          : createInvalidValueErrorMessage(options.name, options.baseChannel ?? "state");
      throw new SyncStateError("RENDERER_INVALID_VALUE", message, {
        stateName: options.name,
        baseChannel: options.baseChannel ?? "state",
        cause: error instanceof Error ? error : undefined,
      });
    }
  };

  // IPC set handler
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

// Register IPC listeners
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

// Register main process sync logic
export const state = <StateValue>(
  options: SyncStateMainOptions<StateValue>,
): SyncStateMainHandle<StateValue> => {
  // Merge global configuration (local config takes priority)
  const mergedOptions: SyncStateMainOptions<StateValue> = {
    baseChannel: globalConfig.baseChannel,
    allowRendererSet: globalConfig.allowRendererSet,
    ...options,
  };

  // Validate if initial value is serializable
  if (!validateSerializable(mergedOptions.initialValue)) {
    console.warn(INVALID_INITIAL_VALUE_WARNING_MESSAGE);
    console.warn(`State name: "${mergedOptions.name}"`);
  }

  // IPC channel names
  const channels = createSyncStateChannels(mergedOptions);
  // Main process state store
  const store = createSyncStateStore(mergedOptions.initialValue);
  // Subscription manager
  const subscriptions = createSubscriptions(channels, store.getState);
  // Write and broadcast
  const setStateAndBroadcast = createSetStateAndBroadcast(store.setState, subscriptions.broadcast);
  // IPC invoke handlers
  const invokeHandlers = createInvokeHandlers(store.getState, setStateAndBroadcast, mergedOptions);

  // Clean up IPC listeners
  const dispose = registerIpcHandlers(channels, invokeHandlers, subscriptions);

  return {
    dispose,
    get: store.getState,
    set: setStateAndBroadcast,
  };
};
