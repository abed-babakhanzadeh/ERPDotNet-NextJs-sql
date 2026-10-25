import { expect, test } from "@playwright/test";
import { ADMIN } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ورود", () => {
  test("رمز اشتباه پیام خطا می‌دهد و در صفحه ورود می‌ماند", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(ADMIN.username);
    await page.getByLabel("رمز عبور").fill("wrong-password");
    await page.getByRole("button", { name: /ورود/ }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("ورود موفق به داشبورد می‌رود", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(ADMIN.username);
    await page.getByLabel("رمز عبور").fill(ADMIN.password);
    await page.getByRole("button", { name: /ورود/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /سلام/ })).toBeVisible();
  });

  test("بدون توکن، صفحه داخلی به ورود برمی‌گردد", async ({ page }) => {
    await page.goto("/base-info/units");
    await expect(page).toHaveURL(/\/login/);
  });
});
