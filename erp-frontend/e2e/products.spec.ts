import { expect, test } from "@playwright/test";
import { adminApi, createUnit, uid } from "./helpers";

test.describe("کالا", () => {
  test("تعریف کالا با واحد سنجش و رفتن به صفحه ویرایش آن", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitTitle = `کیلو ${tag}`;
    const unitId = await createUnit(api, unitTitle);

    await page.goto("/base-info/products/create");
    await page.getByLabel("کد کالا").fill(`P-${tag}`);
    await page.getByLabel("نام کالا (فارسی)").fill(`کالای تست ${tag}`);

    // نام دسترس‌پذیر لوک‌آپ از FormLabel می‌آید
    await page.getByRole("combobox", { name: "واحد سنجش اصلی" }).click();
    await page.getByPlaceholder("انتخاب واحد...").fill(tag);
    await page.getByRole("button", { name: unitTitle }).click();
    await expect(
      page.getByRole("combobox", { name: "واحد سنجش اصلی" }),
    ).toContainText(unitTitle);

    const created = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/BaseInfo\/Products$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت و ادامه" }).click();
    // بعد از ثبت، صفحه با window.location عوض می‌شود و بدنه پاسخ دیگر خواندنی نیست؛ شناسه را از آدرس می‌گیریم
    expect((await created).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/base-info\/products\/edit\/\d+$/);
    const id = Number(page.url().split("/").pop());
    await expect(page.getByLabel("نام کالا (فارسی)")).toHaveValue(
      `کالای تست ${tag}`,
    );

    const product = await (
      await api.get(`/api/BaseInfo/Products/${id}`)
    ).json();
    expect(product).toMatchObject({ code: `P-${tag}`, unitId });
    await api.dispose();
  });

  test("کد تکراری خطای فارسی از بک‌اند نشان می‌دهد", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitTitle = `متر ${tag}`;
    await createUnit(api, unitTitle);
    const code = `DUP-${tag}`;

    for (const attempt of [1, 2]) {
      await page.goto("/base-info/products/create");
      await page.getByLabel("کد کالا").fill(code);
      await page
        .getByLabel("نام کالا (فارسی)")
        .fill(`تکراری ${attempt} ${tag}`);
      await page.getByRole("combobox", { name: "واحد سنجش اصلی" }).click();
      await page.getByPlaceholder("انتخاب واحد...").fill(tag);
      await page.getByRole("button", { name: unitTitle }).click();
      const res = page.waitForResponse(
        (r) =>
          r.request().method() === "POST" &&
          /\/BaseInfo\/Products$/.test(r.url()),
      );
      await page.getByRole("button", { name: "ثبت و ادامه" }).click();
      const status = (await res).status();
      if (attempt === 1) {
        expect(status).toBeLessThan(300);
        await expect(page).toHaveURL(/\/base-info\/products\/edit\/\d+$/);
      } else {
        expect(status).toBeGreaterThanOrEqual(400);
        await expect(page).toHaveURL(/\/base-info\/products\/create$/);
        await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
      }
    }
    await api.dispose();
  });
});
