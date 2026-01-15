// Renderer framework name
const frameworkName = "react-query";
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
  const { createRoot } = require("react-dom/client");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
  const { useSyncState } = require("../dist/react-query.cjs");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Create query client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });

  // React render component
  const App = () => {
    const { data: count, isSynced, update } = useSyncState(0, {
      baseChannel: "state",
      name: "counter",
    });

    // Expose for testing
    globalThis.__frameworkState = { update };

    // Update test value when count changes
    React.useEffect(() => {
      updateFrameworkValue(count);
      if (isSynced) {
        markFrameworkReady();
      }
    }, [count, isSynced]);

    return null;
  };

  const root = createRoot(mountNode);
  root.render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(App),
    ),
  );
} catch (error) {
  globalThis.__frameworkError = String(error);
}
