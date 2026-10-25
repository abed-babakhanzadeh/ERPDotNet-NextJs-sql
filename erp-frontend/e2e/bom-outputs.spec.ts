import { expect, test, type Page } from "@playwright/test";
import { adminApi, createBom, createProduct, createUnit, uid } from "./helpers";

async function pickProduct(page: Page, combobox: string, code: string) {
  await page.getByRole("combobox", { name: combobox }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
}

test.describe("مقدار پایه BOM و محصولات همزاد/فرعی", () => {
  test("BOM با مقدار پایه، محصول همزاد و فرعی از فرم ثبت و ویرایش می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const oilCode = `OIL-${tag}`;
    const oilId = await createProduct(api, { code: oilCode, name: `روغن ${tag}`, unitId, supplyType: 2 });
    const seedCode = `SD-${tag}`;
    const seedId = await createProduct(api, { code: seedCode, name: `دانه ${tag}`, unitId });
    const mealCode = `ML-${tag}`;
    const mealId = await createProduct(api, { code: mealCode, name: `کنجاله ${tag}`, unitId });
    const wasteCode = `WS-${tag}`;
    const wasteId = await createProduct(api, { code: wasteCode, name: `تفاله ${tag}`, unitId });

    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", oilCode);
    await page.getByLabel("عنوان فرمول").fill(`روغن‌کشی ${tag}`);
    await page.getByLabel("مقدار پایه (اقلام برای این مقدار)").fill("100");

    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "ماده اولیه ردیف 1", seedCode);
    await page.getByLabel("مقدار مصرفی ردیف 1").fill("250");
    await expect(page.getByLabel("واحد مصرفی ردیف 1")).toContainText(`کیلو ${tag}`);

    await page.getByRole("tab", { name: /محصولات همزاد و فرعی/ }).click();
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "کالای خروجی ردیف 1", mealCode);
    await page.getByLabel("مقدار ردیف 1").fill("140");
    await page.getByLabel("سهم بها ردیف 1").fill("100");
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "کالای خروجی ردیف 2", wasteCode);
    await page.getByLabel("نوع خروجی ردیف 2").selectOption({ label: "محصول فرعی / ضایعات" });
    await expect(page.getByLabel("سهم بها ردیف 2")).toBeDisabled();
    await page.getByLabel("مقدار ردیف 2").fill("10");

    // تمام بها به محصول همزاد رسیده؛ برای محصول اصلی چیزی نمی‌ماند
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(page.getByText(/جمع سهم بهای محصولات همزاد باید کمتر از ۱۰۰ باشد/).first()).toBeVisible();

    await page.getByLabel("سهم بها ردیف 1").fill("30");
    const created = page.waitForResponse(
      (r) => r.request().method() === "POST" && /\/ProductEngineering\/BOMs$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    const res = await created;
    expect(res.status()).toBeLessThan(300);
    const bomId = Number(await res.text());

    const bom = await (await api.get(`/api/ProductEngineering/BOMs/${bomId}`)).json();
    expect(bom.baseQuantity).toBe(100);
    expect(bom.details).toMatchObject([{ childProductId: seedId, quantity: 250 }]);
    expect(bom.outputs).toMatchObject([
      { productId: mealId, typeId: 1, quantity: 140, costSharePercent: 30 },
      { productId: wasteId, typeId: 2, quantity: 10, costSharePercent: 0 },
    ]);

    // ویرایش: فرم خروجی‌ها را بارگذاری می‌کند و حذف یک خروجی ذخیره می‌شود
    await page.goto(`/product-engineering/boms/edit/${bomId}`);
    await expect(page.getByLabel("مقدار پایه (اقلام برای این مقدار)")).toHaveValue("100");
    await page.getByRole("tab", { name: /محصولات همزاد و فرعی \(2\)/ }).click();
    await expect(page.getByLabel("سهم بها ردیف 1")).toHaveValue("30");
    await expect(page.getByLabel("نوع خروجی ردیف 2")).toHaveValue("2");
    await page
      .getByRole("row")
      .filter({ has: page.getByLabel("نوع خروجی ردیف 2") })
      .getByRole("button", { name: /حذف/ })
      .click();
    const updated = page.waitForResponse(
      (r) => r.request().method() === "PUT" && /\/ProductEngineering\/BOMs\/\d+$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    expect((await updated).status()).toBeLessThan(300);
    const after = await (await api.get(`/api/ProductEngineering/BOMs/${bomId}`)).json();
    expect(after.outputs).toMatchObject([{ productId: mealId, costSharePercent: 30 }]);
    expect(after.outputs).toHaveLength(1);
    await api.dispose();
  });

  test("درخت محصول مقادیر را به نسبت مقدار پایه هر فرمول محاسبه می‌کند", async () => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const finalId = await createProduct(api, { code: `F-${tag}`, name: `نهایی ${tag}`, unitId, supplyType: 2 });
    const semiId = await createProduct(api, { code: `S-${tag}`, name: `نیمه‌ساخته ${tag}`, unitId, supplyType: 2 });
    const rawId = await createProduct(api, { code: `R-${tag}`, name: `خام ${tag}`, unitId });

    // ۴ نیمه‌ساخته با ۲ ماده خام ساخته می‌شود؛ ۱۰ محصول نهایی ۲۰ نیمه‌ساخته لازم دارد
    await createBom(api, { productId: semiId, title: `S ${tag}`, baseQuantity: 4, components: [{ productId: rawId, unitId, quantity: 2 }] });
    const finalBom = await createBom(api, {
      productId: finalId,
      title: `F ${tag}`,
      baseQuantity: 10,
      components: [{ productId: semiId, unitId, quantity: 20 }],
    });

    const tree = await (await api.get(`/api/ProductEngineering/BOMs/${finalBom}/tree`)).json();
    expect(tree.totalQuantity).toBe(10);
    const semi = tree.children[0];
    expect(semi).toMatchObject({ productId: semiId, quantity: 20, totalQuantity: 20 });
    expect(semi.children[0]).toMatchObject({ productId: rawId, quantity: 2, totalQuantity: 10 });
    await api.dispose();
  });
});
