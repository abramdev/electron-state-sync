import { _electron as electron, expect, test } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// 当前文件路径
const currentFile = fileURLToPath(import.meta.url);
// 当前目录路径
const currentDir = dirname(currentFile);
// Electron 应用目录
const appDir = currentDir;
// 兼容 ESM 的 require
const require = createRequire(import.meta.url);
// Electron 可执行文件路径
const electronPath = require("electron") as string;

// E2E 同步测试
// 需要验证的渲染框架列表
const frameworks = ["react", "vue", "svelte", "solid"] as const;

// 依次验证各框架的渲染端桥接
frameworks.forEach((framework) => {
  test(`主进程与渲染端同步(${framework})`, async () => {
    const app = await electron.launch({
      args: [appDir, `--framework=${framework}`],
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
      throw new Error("syncState 未注入");
    }

    await window.waitForFunction(() => {
      const state = globalThis as { __frameworkReady?: boolean; __frameworkError?: string };
      return Boolean(state.__frameworkReady || state.__frameworkError);
    });

    // 框架初始化错误信息
    const frameworkError = await window.evaluate(
      () => (globalThis as { __frameworkError?: string }).__frameworkError,
    );
    if (frameworkError) {
      throw new Error(frameworkError);
    }

    // 框架初始值
    const initialFrameworkValue = await window.evaluate(
      () => (globalThis as { __frameworkValue?: number }).__frameworkValue,
    );

    expect(initialFrameworkValue).toBe(0);

    // 批量更新的目标值
    const valuesToSet = [2, 5, 9];

    for (const value of valuesToSet) {
      await window.evaluate(async (nextValue) => {
        const bridge = (globalThis as { syncState?: { set: (options: { baseChannel: string; name: string }, value: number) => Promise<void> } }).syncState;
        if (!bridge) {
          throw new Error("syncState 未注入");
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
          throw new Error("syncState 未注入");
        }

        return bridge.get({ baseChannel: "state", name: "counter" });
      });

      expect(updatedValue).toBe(value);
    }

    await app.close();
  });
});
