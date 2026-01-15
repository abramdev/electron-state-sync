import { _electron as electron, expect, test } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Current file path
const currentFile = fileURLToPath(import.meta.url);
// Current directory path
const currentDir = dirname(currentFile);
// Electron app directory
const appDir = currentDir;
// ESM-compatible require
const require = createRequire(import.meta.url);
// Electron executable path
const electronPath = require("electron") as string;

// E2E sync test - React
test("Main process and renderer sync - react", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=react"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );

  await window.waitForFunction(() => {
    const state = globalThis as { __syncStateReady?: boolean; __syncStateError?: string };
    return Boolean(state.__syncStateReady || state.__syncStateError);
  });

  const preloadError = await window.evaluate(
    () => (globalThis as { __syncStateError?: string }).__syncStateError,
  );
  if (preloadError) {
    throw new Error(preloadError);
  }

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  const initialFrameworkValue = await window.evaluate(
    () => (globalThis as { __frameworkValue?: number }).__frameworkValue,
  );

  expect(initialFrameworkValue).toBe(0);

  const valuesToSet = [2, 5, 9];

  for (const value of valuesToSet) {
    await window.evaluate(async (nextValue) => {
      const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: number) => Promise<void> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      await bridge.set({ baseChannel: "state", name: "counter" }, nextValue);
    }, value);

    await window.waitForFunction(
      (nextValue) =>
        (globalThis as { __frameworkValue?: number }).__frameworkValue === nextValue,
      value,
    );

    const updatedValue = await window.evaluate(async () => {
      const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      return bridge.get({ baseChannel: "state", name: "counter" });
    });

    expect(updatedValue).toBe(value);
  }

  await app.close();
});

// E2E sync test - Vue
test("Main process and renderer sync - vue", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=vue"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );

  await window.waitForFunction(() => {
    const state = globalThis as { __syncStateReady?: boolean; __syncStateError?: string };
    return Boolean(state.__syncStateReady || state.__syncStateError);
  });

  const preloadError = await window.evaluate(
    () => (globalThis as { __syncStateError?: string }).__syncStateError,
  );
  if (preloadError) {
    throw new Error(preloadError);
  }

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  const initialFrameworkValue = await window.evaluate(
    () => (globalThis as { __frameworkValue?: number }).__frameworkValue,
  );

  expect(initialFrameworkValue).toBe(0);

  const valuesToSet = [2, 5, 9];

  for (const value of valuesToSet) {
    await window.evaluate(async (nextValue) => {
      const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: number) => Promise<void> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      await bridge.set({ baseChannel: "state", name: "counter" }, nextValue);
    }, value);

    await window.waitForFunction(
      (nextValue) =>
        (globalThis as { __frameworkValue?: number }).__frameworkValue === nextValue,
      value,
    );

    const updatedValue = await window.evaluate(async () => {
      const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      return bridge.get({ baseChannel: "state", name: "counter" });
    });

    expect(updatedValue).toBe(value);
  }

  await app.close();
});

// E2E sync test - Vue multi-window object sync
test("Renderer update object sync - vue multi-window", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=vue", "--windows=2"],
    executablePath: electronPath,
  });

  const firstWindow = await app.firstWindow({ timeout: 10_000 });
  // Second window reference
  const secondWindow =
    app.windows().find((page) => page !== firstWindow) ??
    (await app.waitForEvent("window"));
  // List of windows participating in sync
  const windows = [firstWindow, secondWindow];

  for (const window of windows) {
    await window.waitForFunction(
      () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
    );

    await window.waitForFunction(() => {
      const state = globalThis as { __syncStateReady?: boolean; __syncStateError?: string };
      return Boolean(state.__syncStateReady || state.__syncStateError);
    });

    const preloadError = await window.evaluate(
      () => (globalThis as { __syncStateError?: string }).__syncStateError,
    );
    if (preloadError) {
      throw new Error(preloadError);
    }

    const syncStateReady = await window.evaluate(
      () => Boolean((globalThis as { syncState?: unknown }).syncState),
    );
    if (!syncStateReady) {
      throw new Error("syncState not injected");
    }

    await window.waitForFunction(() => {
      const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
      return Boolean(state.__frameworkReady || state.__frameworkError);
    });

    const frameworkError = await window.evaluate(
      () => (globalThis as { __frameworkError?: string }).__frameworkError,
    );
    if (frameworkError) {
      throw new Error(frameworkError);
    }
  }

  // Arrays and objects to sync
  const valuesToSet = [
    ["a", "b"],
    { items: ["a", "b"], meta: { count: 2 } },
  ];

  for (const value of valuesToSet) {
    await firstWindow.evaluate((nextValue) => {
      const state = (globalThis as {
        __frameworkState?: { value: unknown };
      }).__frameworkState;
      if (!state) {
        throw new Error("framework state not injected");
      }
      state.value = nextValue;
    }, value);

    for (const window of windows) {
      await window.waitForFunction(
        (expected) => {
          const current = (globalThis as { __frameworkValue?: unknown }).__frameworkValue;
          return JSON.stringify(current) === JSON.stringify(expected);
        },
        value,
      );
    }

    // Main process sync result
    const updatedValue = await firstWindow.evaluate(async () => {
      const bridge = (globalThis as {
        syncState?: {
          get: (options: { baseChannel: string; name: string }) => Promise<unknown>;
        };
      }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      return bridge.get({ baseChannel: "state", name: "counter" });
    });

    expect(updatedValue).toEqual(value);
  }

  await app.close();
});

// E2E sync test - Svelte

test("Main process and renderer sync - svelte", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=svelte"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );

  await window.waitForFunction(() => {
    const state = globalThis as { __syncStateReady?: boolean; __syncStateError?: string };
    return Boolean(state.__syncStateReady || state.__syncStateError);
  });

  const preloadError = await window.evaluate(
    () => (globalThis as { __syncStateError?: string }).__syncStateError,
  );
  if (preloadError) {
    throw new Error(preloadError);
  }

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  const initialFrameworkValue = await window.evaluate(
    () => (globalThis as { __frameworkValue?: number }).__frameworkValue,
  );

  expect(initialFrameworkValue).toBe(0);

  const valuesToSet = [2, 5, 9];

  for (const value of valuesToSet) {
    await window.evaluate(async (nextValue) => {
      const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: number) => Promise<void> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      await bridge.set({ baseChannel: "state", name: "counter" }, nextValue);
    }, value);

    await window.waitForFunction(
      (nextValue) =>
        (globalThis as { __frameworkValue?: number }).__frameworkValue === nextValue,
      value,
    );

    const updatedValue = await window.evaluate(async () => {
      const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      return bridge.get({ baseChannel: "state", name: "counter" });
    });

    expect(updatedValue).toBe(value);
  }

  await app.close();
});

// E2E sync test - Solid
test("Main process and renderer sync - solid", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=solid"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );

  await window.waitForFunction(() => {
    const state = globalThis as { __syncStateReady?: boolean; __syncStateError?: string };
    return Boolean(state.__syncStateReady || state.__syncStateError);
  });

  const preloadError = await window.evaluate(
    () => (globalThis as { __syncStateError?: string }).__syncStateError,
  );
  if (preloadError) {
    throw new Error(preloadError);
  }

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  const initialFrameworkValue = await window.evaluate(
    () => (globalThis as { __frameworkValue?: number }).__frameworkValue,
  );

  expect(initialFrameworkValue).toBe(0);

  const valuesToSet = [2, 5, 9];

  for (const value of valuesToSet) {
    await window.evaluate(async (nextValue) => {
      const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: number) => Promise<void> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      await bridge.set({ baseChannel: "state", name: "counter" }, nextValue);
    }, value);

    await window.waitForFunction(
      (nextValue) =>
        (globalThis as { __frameworkValue?: number }).__frameworkValue === nextValue,
      value,
    );

    const updatedValue = await window.evaluate(async () => {
      const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
      if (!bridge) {
        throw new Error("syncState not injected");
      }

      return bridge.get({ baseChannel: "state", name: "counter" });
    });

    expect(updatedValue).toBe(value);
  }

  await app.close();
});

// E2E sync test - Zustand
test("Main process and renderer sync - zustand", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=zustand"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );
  await window.waitForFunction(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  // Test setting value from renderer
  const result = await window.evaluate(async () => {
    const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: { count: number }) => Promise<void> } }).syncState;
    const store = (globalThis as { __frameworkState?: { getState: () => { count: number; setCount: (value: number) => void } } }).__frameworkState;

    if (!store || !bridge) {
      throw new Error("framework state not injected");
    }

    // First, directly call bridge.set to test main process sync
    await bridge.set({ baseChannel: "state", name: "counter" }, { count: 42 });

    // Then verify local state also updated
    const state = store.getState();
    return { count: state.count, synced: true };
  });

  expect(result.count).toBe(42);
  expect(result.synced).toBe(true);

  // Test main process sync result
  const updatedValue = await window.evaluate(async () => {
    const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<{ count: number }> } }).syncState;
    if (!bridge) {
      throw new Error("syncState not injected");
    }

    return bridge.get({ baseChannel: "state", name: "counter" });
  });

  expect(updatedValue).toEqual({ count: 42 });

  await app.close();
});

// E2E sync test - TanStack Query (React Query)
test("Main process and renderer sync - react-query", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=react-query"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );
  await window.waitForFunction(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  // Test setting value from renderer
  await window.evaluate(async () => {
    const state = (globalThis as { __frameworkState?: { update: (value: number) => void } }).__frameworkState;
    if (!state) {
      throw new Error("framework state not injected");
    }
    state.update(42);
  });

  await window.waitForFunction(() => {
    const value = (globalThis as { __frameworkValue?: number }).__frameworkValue;
    return value === 42;
  });

  // Test main process sync result - react-query syncs the value directly
  const updatedValue = await window.evaluate(async () => {
    const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
    if (!bridge) {
      throw new Error("syncState not injected");
    }

    return bridge.get({ baseChannel: "state", name: "counter" });
  });

  expect(updatedValue).toBe(42);

  await app.close();
});

// E2E sync test - Jotai
test("Main process and renderer sync - jotai", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=jotai"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );
  await window.waitForFunction(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  // Test setting value from renderer
  await window.evaluate(async () => {
    const state = (globalThis as { __frameworkState?: { setCount: (value: number) => void } }).__frameworkState;
    if (!state) {
      throw new Error("framework state not injected");
    }
    state.setCount(42);
  });

  await window.waitForFunction(() => {
    const value = (globalThis as { __frameworkValue?: number }).__frameworkValue;
    return value === 42;
  });

  // Test main process sync result
  const updatedValue = await window.evaluate(async () => {
    const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
    if (!bridge) {
      throw new Error("syncState not injected");
    }

    return bridge.get({ baseChannel: "state", name: "counter" });
  });

  expect(updatedValue).toBe(42);

  await app.close();
});

// E2E sync test - Redux Toolkit
test("Main process and renderer sync - redux", async () => {
  const app = await electron.launch({
    args: [appDir, "--framework=redux"],
    executablePath: electronPath,
  });

  const window = await app.firstWindow({ timeout: 10_000 });

  await window.waitForFunction(
    () => Boolean((globalThis as { __preloadReady?: boolean }).__preloadReady),
  );
  await window.waitForFunction(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );

  const syncStateReady = await window.evaluate(
    () => Boolean((globalThis as { syncState?: unknown }).syncState),
  );
  if (!syncStateReady) {
    throw new Error("syncState not injected");
  }

  await window.waitForFunction(() => {
    const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
    return Boolean(state.__frameworkReady || state.__frameworkError);
  });

  const frameworkError = await window.evaluate(
    () => (globalThis as { __frameworkError?: string }).__frameworkError,
  );
  if (frameworkError) {
    throw new Error(frameworkError);
  }

  // Test setting value from renderer
  await window.evaluate(async () => {
    const state = (globalThis as { __frameworkState?: { setValue: (value: number) => void } }).__frameworkState;
    if (!state) {
      throw new Error("framework state not injected");
    }
    state.setValue(42);
  });

  await window.waitForFunction(() => {
    const value = (globalThis as { __frameworkValue?: number }).__frameworkValue;
    return value === 42;
  });

  // Test main process sync result - redux selector extracts a number value
  const updatedValue = await window.evaluate(async () => {
    const bridge = (globalThis as { syncState?: { get: (options: { baseChannel: string; name: string }) => Promise<number> } }).syncState;
    if (!bridge) {
      throw new Error("syncState not injected");
    }

    return bridge.get({ baseChannel: "state", name: "counter" });
  });

  expect(updatedValue).toBe(42);

  await app.close();
});
