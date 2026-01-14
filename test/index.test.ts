import { expect, test, describe, spyOn } from "bun:test";

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

// 注意：由于 Electron 模块的复杂性，与 IPC 相关的测试（如 state() 函数）
// 需要在真实的 Electron 环境或使用 Playwright 的 E2E 测试中进行
// 纯单元测试部分在其他测试文件中覆盖
