import { describe, expect, test } from "bun:test";

import { resolveSyncStateBridge } from "../src/renderer/bridge";
import type { SyncStateBridge } from "../src/types";

// Construct bridge object
const createBridge = (): SyncStateBridge => ({
  get: async <StateValue>() => 0 as StateValue,
  set: async () => undefined,
  subscribe: () => () => undefined,
});

// Test renderer bridge resolution
describe("resolveSyncStateBridge", () => {
  test("Prefer passed bridge", () => {
    const bridge = createBridge();
    const resolved = resolveSyncStateBridge(bridge);
    expect(resolved).toBe(bridge);
  });

  test("Use globally injected bridge", () => {
    const bridge = createBridge();
    (globalThis as { syncState?: SyncStateBridge }).syncState = bridge;

    const resolved = resolveSyncStateBridge();
    expect(resolved).toBe(bridge);

    delete (globalThis as { syncState?: SyncStateBridge }).syncState;
  });

  test("Throw error when bridge is missing", () => {
    delete (globalThis as { syncState?: SyncStateBridge }).syncState;

    expect(() => resolveSyncStateBridge()).toThrow("globalThis.syncState not injected");
  });
});
