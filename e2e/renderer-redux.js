// Renderer framework name
const frameworkName = "redux";
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
  const { configureStore, createSlice } = require("@reduxjs/toolkit");
  const { Provider, useDispatch, useSelector } = require("react-redux");
  const { syncStateMiddleware } = require("../dist/redux.cjs");
  const { createRoot } = require("react-dom/client");

  if (!mountNode) {
    throw new Error("mount node not found");
  }

  // Create counter slice
  const counterSlice = createSlice({
    name: "counter",
    initialState: { value: 0 },
    reducers: {
      setValue: (state, action) => {
        state.value = action.payload;
      },
    },
  });

  const { setValue } = counterSlice.actions;

  // Create store with sync middleware
  const store = configureStore({
    reducer: {
      counter: counterSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        syncStateMiddleware({
          baseChannel: "state",
          name: "counter",
          selector: (state) => state.counter.value,
          actionType: "counter/setValue",
        })
      ),
  });

  // React render component
  const App = () => {
    const dispatch = useDispatch();
    const count = useSelector((state) => state.counter.value);
    const { isSynced } = require("../dist/redux.cjs").useSyncState({
      baseChannel: "state",
      name: "counter",
      selector: (state) => state.counter.value,
    });

    // Expose for testing
    globalThis.__frameworkState = {
      setValue: (value) => dispatch(setValue(value)),
    };

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
      { store },
      React.createElement(App),
    ),
  );
} catch (error) {
  globalThis.__frameworkError = String(error);
}
