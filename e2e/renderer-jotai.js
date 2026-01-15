// Renderer framework name
const frameworkName = "jotai";
// Current framework identifier
globalThis.__frameworkName = frameworkName;
// Framework sync completion flag
globalThis.__frameworkReady = false;
// Framework error info
globalThis.__frameworkError = undefined;
// Framework latest value
globalThis.__frameworkValue = undefined;

// Get mount node
const mountNode = document.getElementById("app");

// Mark framework sync as complete
const markFrameworkReady = () => {
  globalThis.__frameworkReady = true;
};

// Update framework sync value
const updateFrameworkValue = (value) => {
  globalThis.__frameworkValue = value;
  if (mountNode) {
    mountNode.textContent = String(value);
  }
};

// Assert if bridge has been injected
const assertSyncStateBridge = () => {
  if (!globalThis.syncState) {
    throw new Error("syncState not injected");
  }
};

try {
  const React = require("react");
  const { Provider, useAtom, useAtomValue, useSetAtom } = require("jotai");
  const { syncStateAtom, useSyncStateStatus } = require("../dist/jotai.cjs");
  const { createRoot } = require("react-dom/client");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Create synced atom
  const countAtom = syncStateAtom(0, {
    baseChannel: "state",
    name: "counter",
  });

  // React render component
  const App = () => {
    const [count, setCount] = useAtom(countAtom);
    const { isSynced } = useSyncStateStatus({ name: "counter" });

    // Expose for testing
    globalThis.__frameworkState = { setCount };

    // Update test value when count changes
    if (isSynced) {
      markFrameworkReady();
    }

    updateFrameworkValue(count);

    return null;
  };

  const root = createRoot(mountNode);
  root.render(
    React.createElement(
      Provider,
      null,
      React.createElement(App),
    ),
  );
} catch (error) {
  globalThis.__frameworkError = String(error);
}
