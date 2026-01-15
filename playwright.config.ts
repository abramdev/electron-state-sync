import { defineConfig } from "@playwright/test";

// Playwright test configuration
export default defineConfig({
  // E2E test directory
  testDir: "e2e",
  // Test timeout
  timeout: 30_000,
  // Keep Electron tests serial
  fullyParallel: false,
  // Use single worker only
  workers: 1,
  // Output list reporter
  reporter: "list",
});
