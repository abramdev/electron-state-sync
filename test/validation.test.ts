import { SyncStateError } from "../src/types";
import { expect, test, describe } from "bun:test";

// Test sync error codes
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

// Test serialization validation function
describe("Serialization validation function", () => {
  const validateSerializable = (value: unknown): boolean => {
    // Check if value type is serializable
    const checkType = (val: unknown): boolean => {
      if (val === null || val === undefined) return true;
      if (typeof val === "string") return true;
      if (typeof val === "number") return true;
      if (typeof val === "boolean") return true;
      if (typeof val === "function") return false;
      if (typeof val === "symbol") return false;
      if (typeof val === "bigint") return false;

      if (Array.isArray(val)) {
        return val.every(checkType);
      }

      if (typeof val === "object") {
        try {
          // Check for circular references
          JSON.stringify(val);
          // Recursively check all properties
          return Object.values(val).every(checkType);
        } catch {
          return false;
        }
      }

      return true;
    };

    return checkType(value);
  };

  test("should accept serializable primitive type values", () => {
    expect(validateSerializable(0)).toBe(true);
    expect(validateSerializable("hello")).toBe(true);
    expect(validateSerializable(true)).toBe(true);
    expect(validateSerializable(null)).toBe(true);
    expect(validateSerializable(undefined)).toBe(true);
  });

  test("should accept serializable objects and arrays", () => {
    expect(validateSerializable({ a: 1, b: 2 })).toBe(true);
    expect(validateSerializable([1, 2, 3])).toBe(true);
    expect(validateSerializable({ arr: [{ nested: "value" }] })).toBe(true);
  });

  test("should reject function type values", () => {
    expect(validateSerializable(() => console.log("test"))).toBe(false);
  });

  test("should reject Symbol type values", () => {
    expect(validateSerializable(Symbol("test"))).toBe(false);
  });

  test("should reject objects containing circular references", () => {
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;
    expect(validateSerializable(circularObj)).toBe(false);
  });

  test("should reject objects containing functions", () => {
    expect(validateSerializable({ data: 1, fn: () => {} })).toBe(false);
  });

  test("should reject objects containing Symbols", () => {
    expect(validateSerializable({ data: 1, sym: Symbol("test") })).toBe(false);
  });

  test("should reject objects containing BigInt", () => {
    expect(validateSerializable({ data: 1n })).toBe(false);
  });
});
