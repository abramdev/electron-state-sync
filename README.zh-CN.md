# Electron State Sync

[![npm version](https://badge.fury.io/js/electron-state-sync.svg)](https://www.npmjs.com/package/electron-state-sync) [![npm downloads](https://img.shields.io/npm/dm/electron-state-sync)](https://www.npmjs.com/package/electron-state-sync) [![License](https://img.shields.io/npm/l/electron-state-sync)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) [![Electron](https://img.shields.io/badge/Electron-18%2B-brightgreen)](https://electronjs.org/)

🌐 [English](./README.md) | [中文](./README.zh-CN.md)

Electron 主/渲染进程状态同步库。

## 安装

```bash
# npm
npm install electron-state-sync

# yarn
yarn add electron-state-sync

# pnpm
pnpm add electron-state-sync

# bun
bun add electron-state-sync
```

## 特性

- 🔒 **写入控制**：支持只读与可写模式
- ✅ **写入校验**：主进程校验渲染端写入并返回标准错误码
- 🧩 **多框架支持**：React / Vue / Svelte / Solid
- 📦 **轻量构建**：主进程与渲染端依赖可外部化
- 🔌 **自定义桥接**：支持自定义 **SyncStateBridge** 对接
- 🎯 **实时推送**：支持 **subscribe** 实时更新

## 系统要求

- **Electron**: ≥ 18.0.0（推荐 ≥ 32.0.0）
- **Node.js**: ≥ 16.9.0
- **TypeScript**: ≥ 5.0.0（如果使用 TypeScript）

**框架集成**（按需选择）：

- **React**: ≥ 18.0.0
- **Vue**: ≥ 3.0.0
- **Svelte**: ≥ 3.0.0
- **SolidJS**: ≥ 1.0.0

## Electron 同步状态

### 主进程

#### 快速配置

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

  // 主进程操作（可选）
  counter.set(10);           // 修改值（自动广播）
  const value = counter.get();  // 读取值

  createWindow();
});
```

#### 生产级配置

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
    // 是否允许渲染端写入（默认：true）
    allowRendererSet: true,
    // 渲染端写入值的校验或转换
    resolveRendererValue: (value) => {
      if (typeof value !== "number") {
        throw new Error("counter 只接受 number");
      }
      return value;
    },
  });

  // 主进程操作
  counter.set(100);
  const current = counter.get();

  createWindow();
});
```

#### 多状态应用

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
  // 初始化全局配置
  initSyncStateMain({
    baseChannel: "myapp",      // 全局 baseChannel（默认：state）
    allowRendererSet: false,   // 全局只读模式（默认：true）
  });

  // 注册多个状态，自动使用全局配置
  const counter = state({
    name: "counter",
    initialValue: 0,
  });

  const user = state({
    name: "user",
    initialValue: { name: "" },
  });

  // 覆盖全局配置
  const theme = state({
    baseChannel: "settings",  // 覆盖全局配置
    name: "theme",
    initialValue: "light",
    allowRendererSet: true,    // 这个状态可写
  });

  // 主进程操作
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

### 通用接口

浏览器端会暴露 **window.syncState**，包含 **get** / **set** / **subscribe**：

```ts
const bridge = window.syncState;
if (!bridge) {
  throw new Error("syncState 未注入");
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

### 自定义桥接

可以实现 **SyncStateBridge** 自定义对接，再注入到 Hook：

```ts
import type { SyncStateBridge } from "electron-state-sync/renderer";

const customBridge: SyncStateBridge = {
  get: async (options) => window.syncState!.get(options),
  set: async (options, value) => window.syncState!.set(options, value),
  subscribe: (options, listener) => window.syncState!.subscribe(options, listener),
}; // 自定义桥接实现
```

### Vue 端

**useSyncState** 仅依赖通用接口，可以直接复用或自定义桥接实现。

#### 最简化使用

```ts
import { useSyncState } from "electron-state-sync/vue";

const counter = useSyncState(0, {
  name: "counter",
});
```

#### 使用全局配置

```ts
import { initSyncState, useSyncState } from "electron-state-sync/vue";

// 在应用初始化时设置全局配置
initSyncState({
  baseChannel: "myapp",
});

// 所有 Hook 自动使用全局配置
const counter = useSyncState(0, {
  name: "counter",
});

const user = useSyncState({ name: "" }, {
  name: "user",
});

// 覆盖全局配置
const theme = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### 自定义桥接

```ts
import { useSyncState } from "electron-state-sync/vue";

const counter = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
  deep: false,
});
```

### React 端

#### 最简化使用

```ts
import { useSyncState } from "electron-state-sync/react";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});
```

#### 使用全局配置

```ts
import { initSyncState, useSyncState } from "electron-state-sync/react";

// 在应用初始化时设置全局配置
initSyncState({
  baseChannel: "myapp",
});

// 所有 Hook 自动使用全局配置
const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});

const [user, setUser] = useSyncState({ name: "" }, {
  name: "user",
});

// 覆盖全局配置
const [theme, setTheme] = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### 自定义桥接

```ts
import { useSyncState } from "electron-state-sync/react";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
});
```

### Svelte 端

#### 最简化使用

```ts
import { useSyncState } from "electron-state-sync/svelte";

const counter = useSyncState(0, {
  name: "counter",
});
```

#### 使用全局配置

```ts
import { initSyncState, useSyncState } from "electron-state-sync/svelte";

// 在应用初始化时设置全局配置
initSyncState({
  baseChannel: "myapp",
});

// 所有 Store 自动使用全局配置
const counter = useSyncState(0, {
  name: "counter",
});

const user = useSyncState({ name: "" }, {
  name: "user",
});

// 覆盖全局配置
const theme = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### 自定义桥接

```ts
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

### SolidJS 端

#### 最简化使用

```ts
import { useSyncState } from "electron-state-sync/solid";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});
```

#### 使用全局配置

```ts
import { initSyncState, useSyncState } from "electron-state-sync/solid";

// 在应用初始化时设置全局配置
initSyncState({
  baseChannel: "myapp",
});

// 所有 Hook 自动使用全局配置
const [counter, setCounter] = useSyncState(0, {
  name: "counter",
});

const [user, setUser] = useSyncState({ name: "" }, {
  name: "user",
});

// 覆盖全局配置
const [theme, setTheme] = useSyncState("light", {
  baseChannel: "settings",
  name: "theme",
});
```

#### 自定义桥接

```ts
import { useSyncState } from "electron-state-sync/solid";

const [counter, setCounter] = useSyncState(0, {
  name: "counter",
  bridge: customBridge,
});
```

### IPC 通道命名

通道格式为 **${baseChannel}:${name}:get|set|subscribe|unsubscribe|update**。

### 写入权限与校验

- **allowRendererSet: false** 时渲染端写入会抛错，但仍可订阅更新。
- **resolveRendererValue** 用于校验或转换渲染端写入值，抛错会拒绝写入。
- 主进程始终作为权威来源，所有变更都会广播给订阅者。

### 初始值同步

- 渲染端 **initialValue** 仅用于首屏占位，最终以主进程值为准。
- 渲染端会先订阅主进程更新，再调用 **get** 拉取当前值，可能会触发一次覆盖更新。
- 若主进程初始值与渲染端一致，通常不会感知到闪动。
- 渲染端可读取 **isSynced** 判断是否已完成首次同步。
- React/Solid Hook 的第三个返回值为 **isSynced**。
- Vue 返回的 Ref 挂载 **isSynced** 字段。
- Svelte Store 挂载 **isSynced** Store。

### 错误码

- 只读写入：**SyncStateError** 的 **code** 为 **RENDERER_READONLY**。
- 写入校验失败：**SyncStateError** 的 **code** 为 **RENDERER_INVALID_VALUE**。

### 对象深度监听

**仅限 Vue**：深度监听仅在 Vue 集成中支持。

当值是对象时启用深度监听（仅 Vue）：

```ts
// Vue 示例
const profile = useSyncState(
  { name: "Alice" },
  {
    name: "profile",
    deep: true,  // 仅在 Vue 中可用
  }
);
```

**注意**：React、Svelte 和 SolidJS 集成不支持深度监听。在这些框架中，如需监听对象内部变化，请创建新的对象引用以触发更新。

## License

MIT
