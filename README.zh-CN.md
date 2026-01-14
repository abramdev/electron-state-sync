# Electron State Sync

[![npm version](https://badge.fury.io/js/electron-state-sync.svg)](https://www.npmjs.com/package/electron-state-sync) [![npm downloads](https://img.shields.io/npm/dm/electron-state-sync)](https://www.npmjs.com/package/electron-state-sync) [![License](https://img.shields.io/npm/l/electron-state-sync)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) [![Electron](https://img.shields.io/badge/Electron-18%2B-brightgreen)](https://electronjs.org/) [![CI](https://github.com/abramdev/electron-state-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/abramdev/electron-state-sync/actions/workflows/ci.yml)

🌐 [English](./README.md) | [中文](./README.zh-CN.md)

一个轻量级的 Electron 状态同步库，实现主进程与渲染端之间的数据无缝共享。支持 React、Vue、Svelte 和 SolidJS，具备自动多窗口同步功能。

## 安装

```bash
npm install electron-state-sync
```

## 特性

- 📦 **轻量构建**：主进程 6.3KB，渲染端 1.5-2.2KB
- 🧩 **多框架支持**：React / Vue / Svelte / Solid
- 🔒 **写入控制**：支持只读与可写模式
- ✅ **写入校验**：主进程校验渲染端写入并返回标准错误码
- 🔌 **自定义桥接**：支持自定义 **SyncStateBridge** 对接

## 使用方法

### 主进程

#### 快速配置

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

#### 高级配置

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
      throw new Error("counter 只接受 number");
    }
    return value;
  },
});

counter.set(100);
const current = counter.get();
```

#### 多窗口同步

状态变更时所有窗口自动接收更新：

```ts
// main.ts
import { state } from "electron-state-sync/main";

const theme = state({
  name: "theme",
  initialValue: "light",
});

// 所有使用此状态的窗口都会收到更新
theme.set("dark"); // 广播到所有订阅的窗口
```

每个窗口订阅状态变更并自动接收更新：

```ts
// renderer process
import { useSyncState } from "electron-state-sync/react";

const [theme] = useSyncState("light", {
  name: "theme",
});
// 当任一窗口调用 theme.set()，所有窗口自动更新
```

### Preload

```ts
// preload.ts
import { exposeSyncState } from "electron-state-sync/preload";

exposeSyncState();
```

### 通用接口

浏览器端会暴露 **window.syncState**，包含 **get** / **set** / **subscribe**：

```ts
// renderer process
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
// renderer process
import type { SyncStateBridge } from "electron-state-sync/renderer";

const customBridge: SyncStateBridge = {
  get: async (options) => window.syncState!.get(options),
  set: async (options, value) => window.syncState!.set(options, value),
  subscribe: (options, listener) => window.syncState!.subscribe(options, listener),
};
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

## 系统要求

- **Electron**: ≥ 18.0.0（推荐 ≥ 32.0.0）
- **Node.js**: ≥ 16.9.0
- **TypeScript**: ≥ 5.0.0（如果使用 TypeScript）

**框架集成**（按需选择）：

- **React**: ≥ 18.0.0
- **Vue**: ≥ 3.0.0
- **Svelte**: ≥ 3.0.0
- **SolidJS**: ≥ 1.0.0

## License

MIT
