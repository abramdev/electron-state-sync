// 渲染框架名称
const frameworkName = "solid";
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
  if (!globalThis.__frameworkReady) {
    markFrameworkReady();
  }
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
  const solidClientPath = require.resolve("solid-js/dist/solid.cjs");
  const solidClient = require(solidClientPath);
  const solidModulePath = require.resolve("solid-js");
  require.cache[solidModulePath] = {
    exports: solidClient,
  };

  const { createEffect } = solidClient;
  const { render } = require("solid-js/web/dist/web.cjs");
  const { useSyncStateSolid } = require("../dist/solid.cjs");

  if (!mountNode) {
    throw new Error("mount 节点缺失");
  }

  // Solid 渲染组件
  const App = () => {
    const [stateValue, _setStateValue, isSynced] = useSyncStateSolid(0, {
      baseChannel: "state",
      name: "counter",
    });

    createEffect(() => {
      updateFrameworkValue(stateValue());
    });

    createEffect(() => {
      if (isSynced()) {
        markFrameworkReady();
      }
    });

    return document.createTextNode("");
  };

  render(() => App(), mountNode);
  markFrameworkReady();
} catch (error) {
  globalThis.__frameworkError = String(error);
}
