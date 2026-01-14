// 渲染框架名称
const frameworkName = "react";
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
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const { useSyncStateReact } = require("../dist/react.cjs");

  if (!mountNode) {
    throw new Error("mount 节点缺失");
  }

  // React 渲染组件
  const App = () => {
    const [value, _setValue, isSynced] = useSyncStateReact(0, {
      baseChannel: "state",
      name: "counter",
    });

    React.useEffect(() => {
      updateFrameworkValue(value);
    }, [value]);

    React.useEffect(() => {
      if (isSynced) {
        markFrameworkReady();
      }
    }, [isSynced]);

    return React.createElement("div", { id: "value" }, String(value));
  };

  const root = createRoot(mountNode);
  root.render(React.createElement(App));
} catch (error) {
  globalThis.__frameworkError = String(error);
}
