// 渲染框架名称
const frameworkName = "vue";
// 当前框架标识
globalThis.__frameworkName = frameworkName;
// 框架同步完成标记
globalThis.__frameworkReady = false;
// 框架异常信息
globalThis.__frameworkError = undefined;
// 框架最新值
globalThis.__frameworkValue = undefined;

// 获取挂载节点
const mountNode = document.getElementById("app");

// 标记框架同步完成
const markFrameworkReady = () => {
  globalThis.__frameworkReady = true;
};

// 更新框架同步值
const updateFrameworkValue = (value) => {
  globalThis.__frameworkValue = value;
  if (mountNode) {
    mountNode.textContent = String(value);
  }
};

// 校验桥接是否已注入
const assertSyncStateBridge = () => {
  if (!globalThis.syncState) {
    throw new Error("syncState 未注入");
  }
};

try {
  assertSyncStateBridge();
  const { createApp, watch } = require("vue");
  const { useSyncState } = require("../dist/vue.cjs");

  if (!mountNode) {
    throw new Error("mount 节点缺失");
  }

  // Vue 应用根组件
  const app = createApp({
    setup() {
      const state = useSyncState(0, {
        baseChannel: "state",
        name: "counter",
      });

      watch(
        state,
        (value) => {
          updateFrameworkValue(value);
        },
        { immediate: true },
      );

      watch(
        state.isSynced,
        (value) => {
          if (value) {
            markFrameworkReady();
          }
        },
        { immediate: true },
      );

      return {
        state,
      };
    },
    template: "<div id=\"value\">{{ state }}</div>",
  });

  app.mount(mountNode);
} catch (error) {
  globalThis.__frameworkError = String(error);
}
