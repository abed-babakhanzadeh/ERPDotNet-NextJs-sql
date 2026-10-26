import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBom,
  createDoc,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  ok,
  pickProduct,
  uid,
} from "./helpers";

type PlanLine = { productId: number; openOrdersDemand: number; planDemand: number; onHand: number; scheduledReceipts: number; netShortage: number; actionId: number };

test.describe("برنامه‌ریزی مواد", () => {
  test("کسری چندسطحی با موجودی، سفارش باز و تولید در جریان محاسبه می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const cake = await createProduct(api, { code: `CK-${tag}`, name: `کیک ${tag}`, unitId, supplyType: 2 });
    const dough = await createProduct(api, { code: `DG-${tag}`, name: `خمیر ${tag}`, unitId, supplyType: 2 });
    const flour = await createProduct(api, { code: `FL-${tag}`, name: `آرد ${tag}`, unitId });
    // کیک = ۲ خمیر؛ خمیر = ۳ آرد
    await createBom(api, { productId: cake, title: `فرمول کیک ${tag}`, components: [{ productId: dough, unitId, quantity: 2 }] });
    await createBom(api, { productId: dough, title: `فرمول خمیر ${tag}`, components: [{ productId: flour, unitId, quantity: 3 }] });
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    await approveAndPostDoc(
      api,
      await createDoc(api, { docTypeId: receipt.id, warehouseId: warehouse.warehouseId, lines: [{ productId: flour, quantity: 10, locationId: warehouse.locationId }] }),
    );

    // سفارش باز ۲ خمیر: ۶ آرد نیاز دارد و ۲ خمیر در حال تولید است
    const orderId = (await (await ok(await api.post("/api/Production/Orders", { data: { productId: dough, quantity: 2 } }), "ساخت سفارش")).json()).id;
    await ok(await api.post(`/api/Production/Orders/${orderId}/release`), "تأیید سفارش");

    await page.goto("/production/planning");
    await pickProduct(page, "کالای درخواستی", `CK-${tag}`);
    await expect(page.getByRole("combobox", { name: "فرمول ساخت" })).toContainText(`فرمول کیک ${tag}`);
    await page.getByLabel(/^مقدار درخواستی/).fill("3");
    const planned = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/Planning/materials"));
    await page.getByRole("button", { name: "محاسبه" }).click();
    const plan = await (await planned).json();

    const line = (id: number) => plan.lines.find((l: PlanLine) => l.productId === id && !("isDemandRoot" in l && l.isDemandRoot));
    // کیک ۳ ← ۶ خمیر؛ ۲ در حال تولید ← ۴ تولید پیشنهادی
    expect(line(dough)).toMatchObject({ planDemand: 6, scheduledReceipts: 2, netShortage: 4, actionId: 1 });
    // آرد: ۶ سفارش باز + ۱۲ برنامه؛ ۱۰ موجود ← ۸ خرید
    expect(line(flour)).toMatchObject({ openOrdersDemand: 6, planDemand: 12, onHand: 10, netShortage: 8, actionId: 2 });
    // ۱۰ آرد موجود برای شروع سفارش باز (۶ آرد) کافی است
    expect(plan.orders.find((o: { id: number }) => o.id === orderId)).toMatchObject({ canStart: true });

    // جدول واحد با جستجو و فیلتر «فقط کسری‌ها»
    await page.getByLabel("فقط کسری‌ها").click();
    await page.getByLabel("جستجو در همه ستون‌ها").first().fill(`FL-${tag}`);
    const flourRow = page.getByRole("row").filter({ hasText: `FL-${tag}` });
    await expect(flourRow).toContainText("خرید");
    await expect(flourRow).toContainText("۸");

    // بدون کالای درخواستی و بدون سفارش‌های باز چیزی برای محاسبه نیست
    const empty = await api.post("/api/Production/Planning/materials", { data: { includeOpenOrders: false } });
    expect(empty.status()).toBe(400);
    expect(await empty.text()).toContain("کالای درخواستی");

    await api.dispose();
  });
});
