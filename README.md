# Electron State Sync

[![npm version](https://badge.fury.io/js/electron-state-sync.svg)](https://www.npmjs.com/package/electron-state-sync) [![npm downloads](https://img.shields.io/npm/dm/electron-state-sync)](https://www.npmjs.com/package/electron-state-sync) [![License](https://img.shields.io/npm/l/electron-state-sync)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) [![Electron](https://img.shields.io/badge/Electron-18%2B-brightgreen)](https://electronjs.org/)

🌐 [English](./README.md) | [中文](./README.zh-CN.md)

Electron main/renderer process state synchronization library.

## Installation

```bash
npm install electron-state-sync
```

## Features

- 📦 **Lightweight**: Main process and renderer dependencies can be externalized
- 🧩 **Multi-Framework**: React / Vue / Svelte / Solid
- 🔒 **Write Control**: Support for read-only and writable modes
- ✅ **Validation**: Main process validates renderer writes with standard error codes
- 🔌 **Custom Bridge**: Support custom **SyncStateBridge** implementation

## Requirements

- **Electron**: ≥ 18.0.0 (recommended ≥ 32.0.0)
- **Node.js**: ≥ 16.9.0
- **TypeScript**: ≥ 5.0.0 (if using TypeScript)

**Framework Integration** (choose as needed):

- **React**: ≥ 18.0.0
- **Vue**: ≥ 3.0.0
- **Svelte**: ≥ 3.0.0
- **SolidJS**: ≥ 1.0.0

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

#### Multi-State App

```ts
// main.ts
import { initSyncStateMain, state } from "electron-state-sync/main";

initSyncStateMain({
  baseChannel: "myapp",
  allowRendererSet: false,
});

const counter = state({
  name: "counter",
  initialValue: 0,
});

const user = state({
  name: "user",
  initialValue: { name: "" },
});

const theme = state({
  baseChannel: "settings",
  name: "theme",
  initialValue: "light",
  allowRendererSet: true,
});

counter.set(10);
user.set({ name: "Alice" });
theme.set("dark");
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

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});
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

const [counter, setCounter] = useSyncState(0, {
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

**Note**: React, Svelte, and SolidJS integrations do not support deep watch. For object state changes in those frameworks, create a new object reference to trigger updates.

## License

MIT
