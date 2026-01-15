// Renderer framework name
const frameworkName = "zustand";
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
  const { create } = require("zustand");
  const { syncStateMiddleware } = require("../dist/zustand.cjs");

  // Create synced Zustand store
  const store = create(
    syncStateMiddleware({
      baseChannel: "state",
      name: "counter",
    })((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      setCount: (value) => set({ count: value }),
    }))
  );

  // Expose for testing - expose the vanilla store directly
  globalThis.__frameworkState = store;

  // Subscribe to store changes to update test value
  const unsubscribe = store.subscribe((state) => {
    updateFrameworkValue(state.count);
    markFrameworkReady();
  });
} catch (error) {
  globalThis.__frameworkError = String(error);
}
