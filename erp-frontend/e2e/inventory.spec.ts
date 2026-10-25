import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  uid,
} from "./helpers";

test.describe("انبار", () => {
  test("ثبت رسید انبار از فرم، قطعی شدن و دیده شدن در گزارش موجودی", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const code = `INV-${tag}`;
    const productId = await createProduct(api, {
      code,
      name: `پیچ ${tag}`,
      unitId,
    });
    const warehouse = await createWarehouse(api, tag);
    const docType = await createReceiptDocType(api, tag);

    await page.goto("/inventory/docs/create");
    await page.getByRole("combobox", { name: "نوع سند" }).click();
    await page.getByRole("option", { name: docType.title }).click();
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: warehouse.title }).click();

    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await page.getByRole("combobox", { name: "کالا ردیف 1" }).click();
    await page.getByPlaceholder("کد یا نام کالا...").fill(code);
    await page.getByRole("button", { name: new RegExp(code) }).click();
    await page.getByLabel("تعداد ردیف 1").fill("7");
    await page
      .getByLabel("شلف/قفسه ردیف 1")
      .selectOption({ label: warehouse.locationTitle });

    const created = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/Inventory\/Inventory\/docs$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    expect((await created).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/inventory\/docs\/edit\/\d+$/);
    const docId = Number(page.url().split("/").pop());

    const doc = await (
      await api.get(`/api/Inventory/Inventory/docs/${docId}`)
    ).json();
    expect(doc).toMatchObject({
      status: 1,
      docTypeId: docType.id,
      warehouseId: warehouse.warehouseId,
    });
    expect(doc.details).toHaveLength(1);
    expect(doc.details[0]).toMatchObject({
      productId,
      mainUnitQuantity: 7,
      locationId: warehouse.locationId,
    });

    // سند پیش‌نویس هنوز موجودی نمی‌سازد
    const stockBefore = await api.post(
      "/api/Inventory/Inventory/stock/current",
      {
        data: {
          productId,
          pageNumber: 1,
          pageSize: 10,
          sortColumn: "",
          sortDescending: false,
          excludeZeroBalances: true,
        },
      },
    );
    expect((await stockBefore.json()).totalCount).toBe(0);

    await approveAndPostDoc(api, docId);

    await page.goto("/inventory/reports/current-stock");
    await page.getByRole("combobox", { name: "انبار" }).click();
    await page.getByRole("option", { name: warehouse.title }).click();
    const row = page.getByRole("row").filter({ hasText: code });
    await expect(row).toBeVisible();
    await expect(row).toContainText("7");
    await api.dispose();
  });
});
