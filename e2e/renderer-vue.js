// Renderer framework name
const frameworkName = "vue";
// Current framework identifier
globalThis.__frameworkName = frameworkName;
// Framework sync completion flag
globalThis.__frameworkReady = false;
// Framework error info
globalThis.__frameworkError = undefined;
// Framework latest value
globalThis.__frameworkValue = undefined;
// Framework state reference
globalThis.__frameworkState = undefined;

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
  const { createApp, watch } = require("vue");
  const { useSyncState } = require("../dist/vue.cjs");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Vue app root component
  const app = createApp({
    setup() {
      const state = useSyncState(0, {
        baseChannel: "state",
        name: "counter",
        deep: true,
      });

      // Expose state reference for testing
      globalThis.__frameworkState = state;

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
