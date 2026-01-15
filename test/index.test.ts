import { expect, test, describe, spyOn } from "bun:test";

import { SyncStateError } from "../src/types";

// Test error codes
test("SyncStateError should preserve error codes", () => {
  const error = new SyncStateError("RENDERER_READONLY", "readonly");
  expect(error.code).toBe("RENDERER_READONLY");
  expect(error.name).toBe("SyncStateError");
});

// Test validation error codes
test("SyncStateError supports validation error codes", () => {
  const error = new SyncStateError("RENDERER_INVALID_VALUE", "invalid");
  expect(error.code).toBe("RENDERER_INVALID_VALUE");
});

// Note: Due to the complexity of the Electron module, IPC-related tests (such as state() function)
// need to be run in a real Electron environment or using Playwright's E2E tests
// Pure unit tests are covered in other test files
