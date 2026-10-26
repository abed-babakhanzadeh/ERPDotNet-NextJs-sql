import { expect, test } from "@playwright/test";
import { adminApi, approveAndPostDoc, createDoc, createDocType, createProduct, createUnit, createWarehouse, uid } from "./helpers";

const INVENTORY = "/api/Inventory/Inventory";

test.describe("ارزش‌گذاری موجودی", () => {
  test("رسید ریالی بها می‌خواهد، حواله با میانگین موزون ارزش می‌گیرد و در کاردکس و گزارش ارزش دیده می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const product = await createProduct(api, { code: `VL-${tag}`, name: `کالای ریالی ${tag}`, unitId });
    const warehouse = await createWarehouse(api, tag);
    const purchase = await createDocType(api, `رسید خرید ${tag}`, 1, true);
    const issue = await createDocType(api, `حواله ${tag}`, 2, true);
    const line = (quantity: number, unitCost?: number) => ({ productId: product, quantity, locationId: warehouse.locationId, unitCost });

    // تنظیمات: صفحه با توضیح گزینه‌ها؛ گزینه ساخته‌نشده پذیرفته نمی‌شود
    await page.goto("/settings/inventory-valuation");
    await expect(page.getByRole("radiogroup", { name: "روش ارزش‌گذاری" })).toContainText("میانگین موزون متحرک");
    await expect(page.getByText("در دست ساخت").first()).toBeVisible();
    const settings = await (await api.get("/api/Settings/InventoryValuation")).json();
    expect(settings.methods.find((m: { value: number }) => m.value === 3)).toMatchObject({ implemented: false });
    const fifo = await api.put("/api/Settings/InventoryValuation", { data: { ...settings, method: 3 } });
    expect(fifo.status()).toBe(422);

    // رسید ریالی بدون بها قطعی نمی‌شود
    const noCost = await createDoc(api, { docTypeId: purchase, warehouseId: warehouse.warehouseId, lines: [line(10)] });
    await expect(approveAndPostDoc(api, noCost)).rejects.toThrow(/بهای واحد را وارد کنید/);

    // ۱۰ × ۱۰۰۰ + ۱۰ × ۲۰۰۰ ← میانگین ۱۵۰۰؛ حواله ۵ = ۷۵۰۰
    await approveAndPostDoc(api, await createDoc(api, { docTypeId: purchase, warehouseId: warehouse.warehouseId, lines: [line(10, 1000)] }));
    await approveAndPostDoc(api, await createDoc(api, { docTypeId: purchase, warehouseId: warehouse.warehouseId, lines: [line(10, 2000)] }));
    const issueId = await createDoc(api, { docTypeId: issue, warehouseId: warehouse.warehouseId, lines: [line(5)] });
    await approveAndPostDoc(api, issueId);

    const posted = await (await api.get(`${INVENTORY}/docs/${issueId}`)).json();
    expect(posted.details[0]).toMatchObject({ postedUnitCost: 1500, postedTotalCost: 7500 });
    const cardex = await (
      await api.post(`${INVENTORY}/reports/cardex`, { data: { productId: product, warehouseId: warehouse.warehouseId, pageNumber: 1, pageSize: 10 } })
    ).json();
    expect(cardex.items.find((r: { outQuantity: number }) => r.outQuantity === 5)).toMatchObject({ unitCost: 1500, totalCost: 7500 });

    const report = await (await api.post(`${INVENTORY}/reports/valuation`, { data: { pageNumber: 1, pageSize: 10, searchTerm: `VL-${tag}` } })).json();
    expect(report.items).toEqual([expect.objectContaining({ productId: product, quantity: 15, averageCost: 1500, value: 22500 })]);

    // سند قطعی‌شده ستون ارزش ریالی دارد؛ فرم رسید ستون بهای واحد دارد
    await page.goto(`/inventory/docs/edit/${issueId}?mode=view`);
    await expect(page.getByRole("columnheader", { name: "ارزش ریالی" })).toBeVisible();
    await expect(page.getByText("۷٬۵۰۰")).toBeVisible();
    const draft = await createDoc(api, { docTypeId: purchase, warehouseId: warehouse.warehouseId, lines: [line(1, 3000)] });
    await page.goto(`/inventory/docs/edit/${draft}`);
    await expect(page.getByLabel("بهای واحد (ریال) ردیف 1")).toHaveValue("3000");

    await page.goto("/inventory/reports/valuation");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(`VL-${tag}`);
    await expect(page.getByRole("row").filter({ hasText: `VL-${tag}` })).toContainText("۲۲٬۵۰۰");

    await api.dispose();
  });
});
