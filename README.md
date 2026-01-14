# Electron State Sync

Electron main/renderer process state synchronization library.

## Features

- **Main Process Authority**: All state is managed by main process and broadcasted to renderers
- **Renderer Write Control**: Support for read-only and writable modes
- **Write Validation & Error Codes**: Main process validates renderer writes with standard error codes
- **First Sync Marker**: Renderer provides `isSynced` to detect first sync completion
- **Multi-Framework Support**: React / Vue / Svelte / Solid
- **Lightweight Build**: Main process and renderer dependencies can be externalized
- **Custom Bridge**: Support custom `SyncStateBridge` implementation
- **Consistent Channel Naming**: Unified `baseChannel:name` pattern
- **Subscription Updates**: Real-time push via `subscribe`

## Development

```bash
bun run dev
```

## Build

```bash
bun run build
```

Build individual parts:

```bash
bun run build:main
bun run build:preload
bun run build:renderer
```

## Source Export

Build output is the default entry, with additional `source` condition for direct TS source reference (for bundlers that support it).

## Electron Sync State

### Main Process

#### Minimal Configuration

```ts
import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { state } from "electron-state-sync/main";

const createWindow = (): BrowserWindow =>
  new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

app.whenReady().then(() => {
  const counter = state({
    name: "counter",
    initialValue: 0,
  });

  // Main process operations (optional)
  counter.set(10);           // Set value (auto broadcast)
  const value = counter.get();  // Get value

  createWindow();
});
```

#### Full Configuration (Recommended for Production)

```ts
import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { state } from "electron-state-sync/main";

const createWindow = (): BrowserWindow =>
  new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

app.whenReady().then(() => {
  const counter = state({
    baseChannel: "state",
    name: "counter",
    initialValue: 0,
    // Allow renderer write (default: true)
    allowRendererSet: true,
    // Validate or transform renderer writes
    resolveRendererValue: (value) => {
      if (typeof value !== "number") {
        throw new Error("counter only accepts number");
      }
      return value;
    },
  });

  // Main process operations
  counter.set(100);
  const current = counter.get();

  createWindow();
});
```

#### Use Global Configuration (Recommended for Multi-State Apps)

```ts
import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { initSyncStateMain, state } from "electron-state-sync/main";

const createWindow = (): BrowserWindow =>
  new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

app.whenReady().then(() => {
  // Initialize global configuration
  initSyncStateMain({
    baseChannel: "myapp",      // Global baseChannel (default: state)
    allowRendererSet: false,   // Global read-only mode (default: true)
  });

  // Register multiple states, automatically using global config
  const counter = state({
    name: "counter",
    initialValue: 0,
  });

  const user = state({
    name: "user",
    initialValue: { name: "" },
  });

  // Override global config
  const theme = state({
    baseChannel: "settings",  // Override global config
    name: "theme",
    initialValue: "light",
    allowRendererSet: true,    // This state is writable
  });

  // Main process operations
  counter.set(10);
  user.set({ name: "Alice" });
  theme.set("dark");

  createWindow();
});
```

### Preload

```ts
import { exposeSyncState } from "electron-state-sync/preload";

exposeSyncState();
```

### Common Interface

Browser exposes `window.syncState` with `get` / `set` / `subscribe`:

```ts
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

You can implement `SyncStateBridge` for custom integration:

```ts
import type { SyncStateBridge } from "electron-state-sync/renderer";

const customBridge: SyncStateBridge = {
  get: async (options) => window.syncState!.get(options),
  set: async (options, value) => window.syncState!.set(options, value),
  subscribe: (options, listener) => window.syncState!.subscribe(options, listener),
}; // Custom bridge implementation
```

### Vue

`useSyncState` only depends on common interface, can be reused or custom bridge.

#### Minimal Usage

```ts
import { useSyncState } from "electron-state-sync/vue";

const counter = useSyncState(0, {
  name: "counter",
});
```

#### Use Global Configuration

```ts
import { initSyncState, useSyncState } from "electron-state-sync/vue";

// Set global config during app initialization
initSyncState({
  baseChannel: "myapp",
});

// All hooks automatically use global config
const counter = useSyncState(0, {
  name: "counter",
});

const user = useSyncState({ name: "" }, {
  name: "user",
});

// Override global config
const theme = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
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
import { useSyncStateReact } from "electron-state-sync/react";

const [counter, setCounter] = useSyncStateReact(0, {
  name: "counter",
});
```

#### Use Global Configuration

```ts
import { initSyncState, useSyncStateReact } from "electron-state-sync/react";

// Set global config during app initialization
initSyncState({
  baseChannel: "myapp",
});

// All hooks automatically use global config
const [counter, setCounter] = useSyncStateReact(0, {
  name: "counter",
});

const [user, setUser] = useSyncStateReact({ name: "" }, {
  name: "user",
});

// Override global config
const [theme, setTheme] = useSyncStateReact("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
import { useSyncStateReact } from "electron-state-sync/react";

const [counter, setCounter] = useSyncStateReact(0, {
  name: "counter",
  bridge: customBridge,
});
```

### Svelte

#### Minimal Usage

```ts
import { createSyncStateStore } from "electron-state-sync/svelte";

const counter = createSyncStateStore(0, {
  name: "counter",
});
```

#### Use Global Configuration

```ts
import { initSyncState, createSyncStateStore } from "electron-state-sync/svelte";

// Set global config during app initialization
initSyncState({
  baseChannel: "myapp",
});

// All stores automatically use global config
const counter = createSyncStateStore(0, {
  name: "counter",
});

const user = createSyncStateStore({ name: "" }, {
  name: "user",
});

// Override global config
const theme = createSyncStateStore("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
import { createSyncStateStore } from "electron-state-sync/svelte";

const counter = createSyncStateStore(0, {
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
import { useSyncStateSolid } from "electron-state-sync/solid";

const [counter, setCounter] = useSyncStateSolid(0, {
  name: "counter",
});
```

#### Use Global Configuration

```ts
import { initSyncState, useSyncStateSolid } from "electron-state-sync/solid";

// Set global config during app initialization
initSyncState({
  baseChannel: "myapp",
});

// All hooks automatically use global config
const [counter, setCounter] = useSyncStateSolid(0, {
  name: "counter",
});

const [user, setUser] = useSyncStateSolid({ name: "" }, {
  name: "user",
});

// Override global config
const [theme, setTheme] = useSyncStateSolid("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### Custom Bridge

```ts
import { useSyncStateSolid } from "electron-state-sync/solid";

const [counter, setCounter] = useSyncStateSolid(0, {
  name: "counter",
  bridge: customBridge,
});
```

### Channel Naming

Channel format: `${baseChannel}:${name}:get|set|subscribe|unsubscribe|update`.

### Write Permission & Validation

- `allowRendererSet: false` blocks renderer writes and throws error, but subscription still works.
- `resolveRendererValue` validates or transforms renderer writes, throws error rejects write.
- Main process is always the authority source, all changes broadcast to subscribers.

### Initial Value Sync

- Renderer `initialValue` is only for initial placeholder, final value from main process.
- Renderer subscribes to main process updates first, then calls `get` to fetch current value, may trigger one overwrite update.
- If main process initial value matches renderer, usually no flash is perceived.
- Renderer can read `isSynced` to check if first sync completed.
- React/Solid Hook returns `isSynced` as third value.
- Vue Ref has `isSynced` property mounted.
- Svelte Store has `isSynced` store.

### Error Codes

- Readonly write: `SyncStateError` code is `RENDERER_READONLY`.
- Validation failed: `SyncStateError` code is `RENDERER_INVALID_VALUE`.

### Object Deep Watch

Enable deep watch when value is object:

```ts
const profile = useSyncState(
  { name: "Alice" },
  {
    baseChannel: "state",
    name: "profile",
    deep: true,
  }
);
```
