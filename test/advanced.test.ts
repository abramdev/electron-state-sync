import { describe, expect, test } from "bun:test";

import { SyncStateError } from "../src/types";

describe("Error Handling Enhancement Tests", () => {
  describe("SyncStateError Context Support", () => {
    test("should create error with full context", () => {
      const error = new SyncStateError("RENDERER_READONLY", "test message", {
        stateName: "test-state",
        baseChannel: "test-channel",
      });

      expect(error.code).toBe("RENDERER_READONLY");
      expect(error.stateName).toBe("test-state");
      expect(error.baseChannel).toBe("test-channel");
      expect(error.name).toBe("SyncStateError");
    });

    test("should generate full message with context", () => {
      const error = new SyncStateError("RENDERER_READONLY", "render write denied", {
        stateName: "my-counter",
        baseChannel: "app-state",
      });

      const fullMessage = error.getFullMessage();
      expect(fullMessage).toContain("render write denied");
      expect(fullMessage).toContain("my-counter");
      expect(fullMessage).toContain("app-state");
    });

    test("should create error with cause", () => {
      const originalError = new Error("validation failed");
      const error = new SyncStateError("RENDERER_INVALID_VALUE", "invalid value", {
        stateName: "user-profile",
        baseChannel: "user-data",
        cause: originalError,
      });

      expect(error.code).toBe("RENDERER_INVALID_VALUE");
      expect(error.cause).toBe(originalError);
      expect(error.getFullMessage()).toContain("validation failed");
    });

    test("should create error without optional context", () => {
      const error = new SyncStateError("RENDERER_READONLY", "simple message");

      expect(error.code).toBe("RENDERER_READONLY");
      expect(error.stateName).toBeUndefined();
      expect(error.baseChannel).toBeUndefined();
      expect(error.cause).toBeUndefined();
      expect(error.getFullMessage()).toBe("simple message");
    });

    test("should handle error with only stateName", () => {
      const error = new SyncStateError("RENDERER_INVALID_VALUE", "validation error", {
        stateName: "test-state",
      });

      expect(error.stateName).toBe("test-state");
      expect(error.baseChannel).toBeUndefined();

      const fullMessage = error.getFullMessage();
      expect(fullMessage).toContain("validation error");
      expect(fullMessage).toContain("test-state");
    });

    test("should handle error with only baseChannel", () => {
      const error = new SyncStateError("RENDERER_READONLY", "readonly error", {
        baseChannel: "settings",
      });

      expect(error.stateName).toBeUndefined();
      expect(error.baseChannel).toBe("settings");

      const fullMessage = error.getFullMessage();
      expect(fullMessage).toContain("readonly error");
      expect(fullMessage).toContain("settings");
    });
  });

  describe("Error Stack Trace", () => {
    test("should maintain proper stack trace", () => {
      const error = new SyncStateError("RENDERER_READONLY", "stack trace test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("SyncStateError");
    });

    test("should include stack trace when context is provided", () => {
      const error = new SyncStateError("RENDERER_INVALID_VALUE", "stack with context", {
        stateName: "test",
        baseChannel: "channel",
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("SyncStateError");
    });
  });

  describe("Error Code Types", () => {
    test("should support RENDERER_READONLY error code", () => {
      const error = new SyncStateError("RENDERER_READONLY", "message");
      expect(error.code).toBe("RENDERER_READONLY");
    });

    test("should support RENDERER_INVALID_VALUE error code", () => {
      const error = new SyncStateError("RENDERER_INVALID_VALUE", "message");
      expect(error.code).toBe("RENDERER_INVALID_VALUE");
    });
  });

  describe("Backward Compatibility", () => {
    test("should work with old two-parameter constructor", () => {
      // Old calling style should still work
      const error = new SyncStateError("RENDERER_READONLY", "old style error");
      expect(error.code).toBe("RENDERER_READONLY");
      expect(error.message).toBe("old style error");
      expect(error.getFullMessage()).toBe("old style error");
    });
  });
});
