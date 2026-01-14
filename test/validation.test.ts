import { SyncStateError } from "../src/types";
import { expect, test, describe } from "bun:test";

// 测试同步错误码
test("SyncStateError 应该保留错误码", () => {
  const error = new SyncStateError("RENDERER_READONLY", "readonly");
  expect(error.code).toBe("RENDERER_READONLY");
  expect(error.name).toBe("SyncStateError");
});

// 测试校验错误码
test("SyncStateError 支持校验错误码", () => {
  const error = new SyncStateError("RENDERER_INVALID_VALUE", "invalid");
  expect(error.code).toBe("RENDERER_INVALID_VALUE");
});

// 测试序列化验证函数
describe("序列化验证函数", () => {
  const validateSerializable = (value: unknown): boolean => {
    // 检查值的类型是否可序列化
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
          // 检查循环引用
          JSON.stringify(val);
          // 递归检查所有属性
          return Object.values(val).every(checkType);
        } catch {
          return false;
        }
      }

      return true;
    };

    return checkType(value);
  };

  test("应该接受可序列化的基本类型值", () => {
    expect(validateSerializable(0)).toBe(true);
    expect(validateSerializable("hello")).toBe(true);
    expect(validateSerializable(true)).toBe(true);
    expect(validateSerializable(null)).toBe(true);
    expect(validateSerializable(undefined)).toBe(true);
  });

  test("应该接受可序列化的对象和数组", () => {
    expect(validateSerializable({ a: 1, b: 2 })).toBe(true);
    expect(validateSerializable([1, 2, 3])).toBe(true);
    expect(validateSerializable({ arr: [{ nested: "value" }] })).toBe(true);
  });

  test("应该拒绝函数类型的值", () => {
    expect(validateSerializable(() => console.log("test"))).toBe(false);
  });

  test("应该拒绝 Symbol 类型的值", () => {
    expect(validateSerializable(Symbol("test"))).toBe(false);
  });

  test("应该拒绝包含循环引用的对象", () => {
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;
    expect(validateSerializable(circularObj)).toBe(false);
  });

  test("应该拒绝包含函数的对象", () => {
    expect(validateSerializable({ data: 1, fn: () => {} })).toBe(false);
  });

  test("应该拒绝包含 Symbol 的对象", () => {
    expect(validateSerializable({ data: 1, sym: Symbol("test") })).toBe(false);
  });

  test("应该拒绝包含 BigInt 的对象", () => {
    expect(validateSerializable({ data: 1n })).toBe(false);
  });
});
