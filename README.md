# Electron State Sync

[![npm version](https://badge.fury.io/js/electron-state-sync.svg)](https://www.npmjs.com/package/electron-state-sync) [![npm downloads](https://img.shields.io/npm/dm/electron-state-sync)](https://www.npmjs.com/package/electron-state-sync) [![License](https://img.shields.io/npm/l/electron-state-sync)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) [![Electron](https://img.shields.io/badge/Electron-18%2B-brightgreen)](https://electronjs.org/) [![CI](https://github.com/abramdev/electron-state-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/abramdev/electron-state-sync/actions/workflows/ci.yml)

🌐 [English](./README.md) | [中文](./README.zh-CN.md)

A lightweight Electron state synchronization library that enables seamless data sharing between main and renderer processes. Supports React, Vue, Svelte, SolidJS, Zustand, TanStack Query, Jotai, and Redux Toolkit with automatic multi-window sync.

## Installation

```bash
npm install electron-state-sync
```

## Features

- 📦 **Lightweight**: Main 6.3KB, renderer 1.5-2.2KB
- 🧩 **Multi-Framework**: React / Vue / Svelte / Solid / Preact
- 🔄 **State Management**: Zustand / TanStack Query / Jotai / Redux Toolkit
- 🔒 **Write Control**: Support for read-only and writable modes
- ✅ **Validation**: Main process validates renderer writes with standard error codes
- 🔌 **Custom Bridge**: Support custom **SyncStateBridge** implementation

## Usage

### Main Process

#### Quick Setup

```ts
// main.ts
import { state } from "electron-state-sync/main";

const counter = state({
  name: "counter",
  initialValue: 0,
});

counter.set(10);
const value = counter.get();
```

#### Advanced Setup

```ts
// main.ts
import { state } from "electron-state-sync/main";

const counter = state({
  baseChannel: "state",
  name: "counter",
  initialValue: 0,
  allowRendererSet: true,
  resolveRendererValue: (value) => {
    if (typeof value !== "number") {
      throw new Error("counter only accepts number");
    }
    return value;
  },
});

counter.set(100);
const current = counter.get();
```

#### Multi-Window Sync

All windows automatically receive updates when state changes:

```ts
// main.ts
import { state } from "electron-state-sync/main";

const theme = state({
  name: "theme",
  initialValue: "light",
});

// All windows using this state will receive updates
theme.set("dark"); // Broadcast to all subscribed windows
```

#### Stopping Sync

Call `dispose()` to stop syncing and clean up IPC handlers:

```ts
// main.ts
import { state } from "electron-state-sync/main";

const counter = state({
  name: "counter",
  initialValue: 0,
});

counter.set(10);  // Sync and broadcast
counter.get();    // Returns 10

// Stop syncing - removes IPC handlers and clears subscribers
counter.dispose();
```

After `dispose()` is called:
- IPC handlers for `get`/`set`/`subscribe`/`unsubscribe` are removed
- All subscribers are cleared
- Renderer calls will fail silently

Each window subscribes to state changes and receives automatic updates:

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react";

const [theme] = useSyncState("light", {
  name: "theme",
});
// When any window calls theme.set(), all windows update automatically
```

### Preload

```ts
// preload.ts
import { exposeSyncState } from "electron-state-sync/preload";

exposeSyncState();
```

### Common Interface

Browser exposes **window.syncState** with **get** / **set** / **subscribe**:

```ts
// renderer process
const bridge = window.syncState;
if (!bridge) {
  throw new Error("syncState not injected");
}

const value = await bridge.get<number>({
  baseChannel: "state",
  name: "counter",
});

await bridge.set(
  {
    baseChannel: "state",
    name: "counter",
  },
  value + 1
);

const unsubscribe = bridge.subscribe<number>(
  {
    baseChannel: "state",
    name: "counter",
  },
  (nextValue) => {
    console.log(nextValue);
  }
);
```

### Custom Bridge

You can implement **SyncStateBridge** for custom integration:

```ts
// renderer process
import type { SyncStateBridge } from "electron-state-sync/renderer";

const customBridge: SyncStateBridge = {
  get: async (options) => window.syncState!.get(options),
  set: async (options, value) => window.syncState!.set(options, value),
  subscribe: (options, listener) => window.syncState!.subscribe(options, listener),
};
```

### Vue

#### Minimal Usage

```ts
// renderer process
import { useSyncState } from "electron-state-sync/vue";

const counter = useSyncState(0, {
  name: "counter",
});
// counter.isSynced - Ref<boolean>
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState, useSyncState } from "electron-state-sync/vue";

initSyncState({
  baseChannel: "myapp",
});

const counter = useSyncState(0, {
  name: "counter",
});

const user = useSyncState({ name: "" }, {
  name: "user",
});

const theme = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
// renderer process
import { useSyncState } from "electron-state-sync/vue";

const counter = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
  deep: false,
});
```

### React

#### Minimal Usage

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react";

function App() {
  const [counter, setCounter, isSynced] = useSyncState(0, {
    name: "counter",
  });

  return <div onClick={() => setCounter(5)}>{counter}</div>;
}
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState, useSyncState } from "electron-state-sync/react";

initSyncState({
  baseChannel: "myapp",
});

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});

const [user, setUser] = useSyncState({ name: "" }, {
  name: "user",
});

const [theme, setTheme] = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
});
```

### Svelte

#### Minimal Usage

```ts
// renderer process
import { useSyncState } from "electron-state-sync/svelte";

const counter = useSyncState(0, {
  name: "counter",
});
// counter.isSynced - Readable<boolean>
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState, useSyncState } from "electron-state-sync/svelte";

initSyncState({
  baseChannel: "myapp",
});

const counter = useSyncState(0, {
  name: "counter",
});

const user = useSyncState({ name: "" }, {
  name: "user",
});

const theme = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
// renderer process
import { useSyncState } from "electron-state-sync/svelte";

const counter = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
});
```

```svelte
<script lang="ts">
  import { counter } from "./stores";
</script>

<div>{$counter}</div>
```

### SolidJS

#### Minimal Usage

```ts
// renderer process
import { useSyncState } from "electron-state-sync/solid";

const [counter, setCounter, isSynced] = useSyncState(0, {
  name: "counter",
});
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState, useSyncState } from "electron-state-sync/solid";

initSyncState({
  baseChannel: "myapp",
});

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});

const [user, setUser] = useSyncState({ name: "" }, {
  name: "user",
});

const [theme, setTheme] = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
// renderer process
import { useSyncState } from "electron-state-sync/solid";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
});
```

### Zustand

#### Minimal Usage

```ts
// renderer process
import { create } from "zustand";
import { syncStateMiddleware } from "electron-state-sync/zustand";

const useStore = create(
  syncStateMiddleware({ name: "counter" })((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
);

// In component
const count = useStore((state) => state.count);
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState } from "electron-state-sync/zustand";
import { create } from "zustand";
import { syncStateMiddleware } from "electron-state-sync/zustand";

initSyncState({
  baseChannel: "myapp",
});

const useStore = create(
  syncStateMiddleware({ name: "counter" })((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
);
```

#### Custom Bridge

```ts
// renderer process
import { create } from "zustand";
import { syncStateMiddleware } from "electron-state-sync/zustand";

const useStore = create(
  syncStateMiddleware({
    name: "counter",
    bridge: customBridge,
  })((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
);
```

### TanStack Query (React Query)

#### Minimal Usage

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react-query";

function App() {
  const { data: count, isSynced, update } = useSyncState(0, {
    name: "counter",
  });

  return <div onClick={() => update(5)}>{count}</div>;
}
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState, useSyncState } from "electron-state-sync/react-query";

initSyncState({
  baseChannel: "myapp",
});

function App() {
  const { data: count, isSynced, update } = useSyncState(0, {
    name: "counter",
  });

  return <div onClick={() => update(5)}>{count}</div>;
}
```

#### Custom Bridge

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react-query";

function App() {
  const { data: count, isSynced, update } = useSyncState(0, {
    name: "counter",
    bridge: customBridge,
  });

  return <div onClick={() => update(5)}>{count}</div>;
}
```

### Jotai

#### Minimal Usage

```ts
// renderer process
import { atom, useAtom } from "jotai";
import { syncStateAtom } from "electron-state-sync/jotai";

const countAtom = syncStateAtom(0, { name: "counter" });

function App() {
  const [count, setCount] = useAtom(countAtom);
  return <div onClick={() => setCount(5)}>{count}</div>;
}
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState } from "electron-state-sync/jotai";
import { atom, useAtom } from "jotai";
import { syncStateAtom } from "electron-state-sync/jotai";

initSyncState({
  baseChannel: "myapp",
});

const countAtom = syncStateAtom(0, { name: "counter" });

function App() {
  const [count, setCount] = useAtom(countAtom);
  return <div onClick={() => setCount(5)}>{count}</div>;
}
```

#### Custom Bridge

```ts
// renderer process
import { atom, useAtom } from "jotai";
import { syncStateAtom } from "electron-state-sync/jotai";

const countAtom = syncStateAtom(0, {
  name: "counter",
  bridge: customBridge,
});

function App() {
  const [count, setCount] = useAtom(countAtom);
  return <div onClick={() => setCount(5)}>{count}</div>;
}
```

### Redux Toolkit

#### Minimal Usage

```ts
// renderer process
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { syncStateMiddleware } from "electron-state-sync/redux";
import { Provider, useDispatch, useSelector } from "react-redux";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    setValue: (state, action) => {
      state.value = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      syncStateMiddleware({
        name: "counter",
        selector: (state) => state.counter.value,
        actionType: "counter/setValue",
      })
    ),
});

function App() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  return <div onClick={() => dispatch(counterSlice.actions.setValue(5))}>{count}</div>;
}
```

#### Use Global Configuration

```ts
// renderer process
import { initSyncState } from "electron-state-sync/redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { syncStateMiddleware } from "electron-state-sync/redux";

initSyncState({
  baseChannel: "myapp",
});

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    setValue: (state, action) => {
      state.value = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      syncStateMiddleware({
        name: "counter",
        selector: (state) => state.counter.value,
        actionType: "counter/setValue",
      })
    ),
});
```

#### Custom Bridge

```ts
// renderer process
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { syncStateMiddleware } from "electron-state-sync/redux";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    setValue: (state, action) => {
      state.value = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      syncStateMiddleware({
        name: "counter",
        selector: (state) => state.counter.value,
        actionType: "counter/setValue",
        bridge: customBridge,
      })
    ),
});
```

### IPC Channel Naming

Channel format: **${baseChannel}:${name}:get|set|subscribe|unsubscribe|update**.

### Write Permission & Validation

- **allowRendererSet: false** blocks renderer writes and throws error, but subscription still works.
- **resolveRendererValue** validates or transforms renderer writes, throws error rejects write.
- Main process is always the authority source, all changes broadcast to subscribers.

### Initial Value Sync

- Renderer **initialValue** is only for initial placeholder, final value from main process.
- Renderer subscribes to main process updates first, then calls **get** to fetch current value, may trigger one overwrite update.
- If main process initial value matches renderer, usually no flash is perceived.
- Renderer can read **isSynced** to check if first sync completed.
- React/Solid Hook returns **isSynced** as third value.
- Vue Ref has **isSynced** property mounted.
- Svelte Store has **isSynced** store.

### Error Codes

- Readonly write: **SyncStateError** code is **RENDERER_READONLY**.
- Validation failed: **SyncStateError** code is **RENDERER_INVALID_VALUE**.

### Object Deep Watch

**Vue Only**: Deep watch is only supported in Vue integration.

Enable deep watch when value is object (Vue only):

```ts
// Vue example
const profile = useSyncState(
  { name: "Alice" },
  {
    name: "profile",
    deep: true,  // Only available in Vue
  }
);
```

**Note**:
- Vue integration converts reactive proxies to raw values before syncing to ensure IPC serialization.
- React, Svelte, and SolidJS integrations do not support deep watch. For object state changes in those frameworks, create a new object reference to trigger updates.

## Bundle Size

Framework bundles (ESM / CJS):

| Package | ESM | CJS | gzip |
|---------|-----|-----|------|
| Main | 6.44 kB | 6.51 kB | 1.95 kB |
| Preload | 1.49 kB | 1.54 kB | 0.49 kB |
| Zustand | 5.88 kB | 6.06 kB | 1.43 kB |
| Redux | 4.37 kB | 4.54 kB | 1.34 kB |
| React Query | 3.34 kB | 3.53 kB | 1.13 kB |
| Jotai | 3.32 kB | 3.44 kB | 1.14 kB |
| Vue | 2.24 kB | 2.25 kB | 0.81 kB |
| Solid | 2.21 kB | 2.24 kB | 0.77 kB |
| Svelte | 1.77 kB | 1.82 kB | 0.64 kB |
| Preact | 1.43 kB | 1.51 kB | 0.56 kB |
| React | 1.42 kB | 1.45 kB | 0.55 kB |

## Requirements

- **Electron**: ≥ 18.0.0 (recommended ≥ 32.0.0)
- **Node.js**: ≥ 16.9.0
- **TypeScript**: ≥ 5.0.0 (if using TypeScript)

**Framework Integration** (choose as needed):

- **React**: ≥ 18.0.0
- **Vue**: ≥ 3.0.0
- **Svelte**: ≥ 3.0.0
- **SolidJS**: ≥ 1.0.0

**State Management Integration** (choose as needed):

- **Zustand**: ≥ 4.0.0
- **TanStack Query**: ≥ 5.0.0
- **Jotai**: ≥ 2.0.0
- **Redux Toolkit**: ≥ 2.0.0
- **React Redux**: ≥ 9.0.0 (for Redux Toolkit integration)

## License

MIT
