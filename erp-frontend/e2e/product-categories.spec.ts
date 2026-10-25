import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminApi, createProduct, createUnit, uid } from "./helpers";

async function createCategory(
  api: APIRequestContext,
  c: { code: string; title: string; parentId?: number },
): Promise<number> {
  const res = await api.post("/api/BaseInfo/ProductCategories", { data: { parentId: null, ...c } });
  if (!res.ok()) throw new Error(`ساخت گروه کالا: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

function waitForSave(page: Page, method: "POST" | "PUT", path: RegExp) {
  return page.waitForResponse((r) => r.request().method() === method && path.test(r.url()));
}

test.describe("گروه کالا، بارکد و شناسه مالیاتی", () => {
  test("گروه کالای درختی از فرم ثبت می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const parentId = await createCategory(api, { code: `G${tag}`, title: `مواد اولیه ${tag}` });

    await page.goto("/base-info/product-categories/create");
    await page.getByLabel("کد").fill(`S${tag}`);
    await page.getByLabel("عنوان").fill(`فلزات ${tag}`);
    await page.getByRole("combobox", { name: "گروه والد" }).click();
    await page.getByRole("option", { name: `G${tag} - مواد اولیه ${tag}` }).click();
    const res = waitForSave(page, "POST", /\/BaseInfo\/ProductCategories$/);
    await page.getByRole("button", { name: "ثبت گروه کالا" }).click();
    const child = await (await api.get(`/api/BaseInfo/ProductCategories/${(await (await res).json()).id}`)).json();
    expect(child).toMatchObject({ parentId, parentTitle: `مواد اولیه ${tag}` });

    await page.goto("/base-info/product-categories");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(tag);
    await expect(page.getByRole("row").filter({ hasText: `S${tag}` })).toContainText(`مواد اولیه ${tag}`);
    await api.dispose();
  });

  test("گروه، بارکد و شناسه مالیاتی روی کالا ذخیره می‌شوند و بارکد تکراری رد می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const categoryId = await createCategory(api, { code: `G${tag}`, title: `قطعات ${tag}` });
    const barcode = `626${Date.now()}`.slice(0, 13);
    const productId = await createProduct(api, { code: `P-${tag}`, name: `کالا ${tag}`, unitId });
    const otherId = await createProduct(api, { code: `Q-${tag}`, name: `کالای دوم ${tag}`, unitId });

    await page.goto(`/base-info/products/edit/${productId}`);
    await expect(page.getByLabel("نام کالا (فارسی)")).toHaveValue(`کالا ${tag}`);
    await page.getByRole("combobox", { name: "گروه کالا" }).click();
    await page.getByRole("option", { name: `G${tag} - قطعات ${tag}` }).click();
    await page.getByLabel("بارکد").fill(barcode);
    await page.getByLabel("شناسه مالیاتی کالا (۱۳ رقمی)").fill("12345");
    await page.getByRole("button", { name: "ثبت تغییرات" }).click();
    await expect(page.getByText("شناسه مالیاتی کالا باید ۱۳ رقم باشد")).toBeVisible();

    await page.getByLabel("شناسه مالیاتی کالا (۱۳ رقمی)").fill("2710000000013");
    const saved = waitForSave(page, "PUT", /\/BaseInfo\/Products\/\d+$/);
    await page.getByRole("button", { name: "ثبت تغییرات" }).click();
    expect((await saved).status()).toBeLessThan(300);
    const product = await (await api.get(`/api/BaseInfo/Products/${productId}`)).json();
    expect(product).toMatchObject({ categoryId, categoryTitle: `قطعات ${tag}`, barcode, taxCode: "2710000000013" });

    await page.goto(`/base-info/products/edit/${otherId}`);
    await expect(page.getByLabel("نام کالا (فارسی)")).toHaveValue(`کالای دوم ${tag}`);
    await page.getByLabel("بارکد").fill(barcode);
    const rejected = waitForSave(page, "PUT", /\/BaseInfo\/Products\/\d+$/);
    await page.getByRole("button", { name: "ثبت تغییرات" }).click();
    expect((await rejected).status()).toBe(400);
    await expect(page.getByText("این بارکد قبلاً برای کالای دیگری ثبت شده است.").first()).toBeVisible();
    await api.dispose();
  });

  test("گروهی که به کالا تخصیص داده شده حذف نمی‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const categoryId = await createCategory(api, { code: `G${tag}`, title: `بسته‌بندی ${tag}` });
    const res = await api.post("/api/BaseInfo/Products", {
      data: { code: `P-${tag}`, name: `کارتن ${tag}`, unitId, supplyType: 1, categoryId, conversions: [] },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto("/base-info/product-categories");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(tag);
    const row = page.getByRole("row").filter({ hasText: `G${tag}` });
    await row.getByRole("button", { name: "حذف" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("این گروه کالا به کالا تخصیص داده شده و قابل حذف نیست.").first()).toBeVisible();
    expect((await api.get(`/api/BaseInfo/ProductCategories/${categoryId}`)).status()).toBe(200);
    await api.dispose();
  });
});
