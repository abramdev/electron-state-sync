import { expect, test, describe, spyOn, mock } from "bun:test";

// Mock electron 模块
mock.module("electron", () => ({
  ipcMain: {
    handle: () => ({} as any),
    on: () => ({} as any),
    removeHandler: () => {},
    removeListener: () => {},
  },
  IpcMainEvent: class IpcMainEvent {
    public readonly sender = new (class WebContents {
      public isDestroyed() {
        return false;
      }
      public send() {}
      public once() {}
    })();
  },
  IpcMainInvokeEvent: class IpcMainInvokeEvent {
    public readonly sender = new (class WebContents {
      public isDestroyed() {
        return false;
      }
      public send() {}
      public once() {}
    })();
  },
  WebContents: class WebContents {
    public isDestroyed() {
      return false;
    }
    public send() {}
    public once() {}
  },
}));

import { state } from "../src/main";
import { SyncStateError } from "../src/types";

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

// 测试初始值验证
describe("初始值序列化验证", () => {
  test("应该接受可序列化的基本类型值", () => {
    expect(() =>
      state({
        name: "test-number",
        initialValue: 0,
      }),
    ).not.toThrow();

    expect(() =>
      state({
        name: "test-string",
        initialValue: "hello",
      }),
    ).not.toThrow();

    expect(() =>
      state({
        name: "test-boolean",
        initialValue: true,
      }),
    ).not.toThrow();

    expect(() =>
      state({
        name: "test-null",
        initialValue: null,
      }),
    ).not.toThrow();
  });

  test("应该接受可序列化的对象和数组", () => {
    expect(() =>
      state({
        name: "test-object",
        initialValue: { a: 1, b: 2 },
      }),
    ).not.toThrow();

    expect(() =>
      state({
        name: "test-array",
        initialValue: [1, 2, 3],
      }),
    ).not.toThrow();

    expect(() =>
      state({
        name: "test-nested",
        initialValue: { arr: [{ nested: "value" }] },
      }),
    ).not.toThrow();
  });

  test("应该对不可序列化的值发出警告而不是报错", () => {
    const consoleWarnSpy = spyOn(console, "warn");

    // 函数类型 - 应该发出警告但不报错
    expect(() =>
      state({
        name: "test-function",
        initialValue: () => console.log("test"),
      }),
    ).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockClear();

    // Symbol 类型 - 应该发出警告但不报错
    expect(() =>
      state({
        name: "test-symbol",
        initialValue: Symbol("test"),
      }),
    ).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockClear();

    // 包含函数的对象 - 应该发出警告但不报错
    expect(() =>
      state({
        name: "test-object-with-function",
        initialValue: { data: 1, fn: () => {} },
      }),
    ).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  test("应该提供正确的警告信息", () => {
    const consoleWarnSpy = spyOn(console, "warn");

    state({
      name: "test-warn-message",
      initialValue: () => {},
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("警告"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("不可序列化"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('test-warn-message'),
    );
  });

  test("应该对包含循环引用的对象发出警告", () => {
    const consoleWarnSpy = spyOn(console, "warn");
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;

    expect(() =>
      state({
        name: "test-circular",
        initialValue: circularObj,
      }),
    ).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
