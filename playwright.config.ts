import { defineConfig } from "@playwright/test";

// Playwright 测试配置
export default defineConfig({
  // E2E 测试目录
  testDir: "e2e",
  // 单测超时时间
  timeout: 30_000,
  // Electron 测试保持串行
  fullyParallel: false,
  // 仅使用单 worker
  workers: 1,
  // 输出列表报告
  reporter: "list",
});
