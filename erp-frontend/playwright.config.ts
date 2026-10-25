import { defineConfig, devices } from "@playwright/test";

/**
 * تست‌های E2E روی بک‌اند و دیتابیس واقعی اجرا می‌شوند (نه ماک).
 * پیش‌نیاز: API روی E2E_API_URL و فرانت روی E2E_BASE_URL بالا باشند؛
 * در CI این کار را job «تست E2E» انجام می‌دهد.
 */
export default defineConfig({
  testDir: "./e2e",
  // تست‌ها روی یک دیتابیس مشترک داده می‌سازند؛ موازی‌سازی در سطح فایل امن است
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fa-IR",
    viewport: { width: 1366, height: 860 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 }, storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
  ],
});
