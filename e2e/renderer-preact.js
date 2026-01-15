// Renderer framework name
const frameworkName = "preact";
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
  assertSyncStateBridge();
  const { h } = require("preact");
  const { render } = require("preact");
  const { useSyncState } = require("../dist/preact.cjs");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Preact render component
  const App = () => {
    const [value, _setValue, isSynced] = useSyncState(0, {
      baseChannel: "state",
      name: "counter",
    });

    value !== undefined && updateFrameworkValue(value);

    isSynced && markFrameworkReady();

    return h("div", { id: "value" }, String(value));
  };

  render(h(App), mountNode);
} catch (error) {
  globalThis.__frameworkError = String(error);
}
