// Renderer framework name
const frameworkName = "svelte";
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
  const { createSyncStateStore } = require("../dist/svelte.cjs");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Svelte sync state store
  const store = createSyncStateStore(0, {
    baseChannel: "state",
    name: "counter",
  });

  store.subscribe((value) => {
    updateFrameworkValue(value);
  });

  store.isSynced.subscribe((value) => {
    if (value) {
      markFrameworkReady();
    }
  });
} catch (error) {
  globalThis.__frameworkError = String(error);
}
