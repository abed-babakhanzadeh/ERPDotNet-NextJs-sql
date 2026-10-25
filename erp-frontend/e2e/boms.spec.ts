import { expect, test, type Page } from "@playwright/test";
import { adminApi, createBom, createProduct, createUnit, uid } from "./helpers";

async function pickProduct(page: Page, combobox: string, code: string) {
  await page.getByRole("combobox", { name: combobox }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
}

test.describe("فرمول ساخت (BOM)", () => {
  test("ثبت BOM با دو ماده اولیه از فرم", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const parentCode = `CH-${tag}`;
    const parentId = await createProduct(api, { code: parentCode, name: `صندلی ${tag}`, unitId, supplyType: 2 });
    const legCode = `LG-${tag}`;
    const legId = await createProduct(api, { code: legCode, name: `پایه ${tag}`, unitId });
    const seatCode = `ST-${tag}`;
    const seatId = await createProduct(api, { code: seatCode, name: `نشیمن ${tag}`, unitId });

    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", parentCode);
    await page.getByLabel("عنوان فرمول").fill(`فرمول صندلی ${tag}`);

    const components = [
      { code: legCode, qty: "4" },
      { code: seatCode, qty: "1" },
    ];
    for (let i = 0; i < components.length; i++) {
      await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
      await pickProduct(page, `ماده اولیه ردیف ${i + 1}`, components[i].code);
      await page.getByLabel(`مقدار مصرفی ردیف ${i + 1}`).fill(components[i].qty);
    }

    const created = page.waitForResponse((r) => r.request().method() === "POST" && /\/ProductEngineering\/BOMs$/.test(r.url()));
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    const res = await created;
    expect(res.status()).toBeLessThan(300);
    const bomId = Number(await res.text());

    const bom = await (await api.get(`/api/ProductEngineering/BOMs/${bomId}`)).json();
    expect(bom.productId).toBe(parentId);
    const lines = Object.fromEntries(bom.details.map((d: { childProductId: number; quantity: number }) => [d.childProductId, d.quantity]));
    expect(lines).toEqual({ [legId]: 4, [seatId]: 1 });
    await api.dispose();
  });

  test("BOM چرخه‌ای (الف در ب و ب در الف) رد می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const aCode = `A-${tag}`;
    const aId = await createProduct(api, { code: aCode, name: `نیمه‌ساخته الف ${tag}`, unitId, supplyType: 2 });
    const bCode = `B-${tag}`;
    const bId = await createProduct(api, { code: bCode, name: `نیمه‌ساخته ب ${tag}`, unitId, supplyType: 2 });
    await createBom(api, { productId: aId, title: `الف ${tag}`, components: [{ productId: bId, unitId, quantity: 1 }] });

    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", bCode);
    await page.getByLabel("عنوان فرمول").fill(`ب ${tag}`);
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "ماده اولیه ردیف 1", aCode);
    await page.getByLabel("مقدار مصرفی ردیف 1").fill("1");

    const rejected = page.waitForResponse((r) => r.request().method() === "POST" && /\/ProductEngineering\/BOMs$/.test(r.url()));
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    expect((await rejected).status()).toBe(400);
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/boms\/create$/);
    await api.dispose();
  });
});
