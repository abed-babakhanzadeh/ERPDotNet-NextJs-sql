import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBatch,
  createDoc,
  createDocType,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  uid,
} from "./helpers";

const days = (n: number) => new Date(Date.now() + n * 864e5);

test.describe("پیشنهاد بچ FEFO", () => {
  test("حواله کالای بچ‌دار از زودترین انقضا پر و بین بچ‌ها شکسته می‌شود؛ بچ منقضی پیشنهاد نمی‌شود", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `بسته ${tag}`);
    const code = `MED-${tag}`;
    const productId = await createProduct(api, {
      code,
      name: `دارو ${tag}`,
      unitId,
    });
    const batch = (batchNumber: string, expiry: number) =>
      createBatch(api, {
        productId,
        unitId,
        batchNumber,
        expiryDate: days(expiry),
      });
    const lateId = await batch(`LATE-${tag}`, 120);
    const earlyId = await batch(`EARLY-${tag}`, 20);
    const expiredId = await batch(`OLD-${tag}`, -5);
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    const line = (batchId: number, quantity: number) => ({
      productId,
      quantity,
      locationId: warehouse.locationId,
      batchId,
    });
    // رسید بچ منقضی مجاز است؛ فقط خروجش کنترل می‌شود
    const receiptId = await createDoc(api, {
      docTypeId: receipt.id,
      warehouseId: warehouse.warehouseId,
      lines: [line(lateId, 10), line(earlyId, 4), line(expiredId, 50)],
    });
    await approveAndPostDoc(api, receiptId);
    const issueTitle = `حواله ${tag}`;
    await createDocType(api, issueTitle, 2);

    await page.goto("/inventory/docs/create");
    await page.getByRole("combobox", { name: "نوع سند" }).click();
    await page.getByRole("option", { name: issueTitle }).click();
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: warehouse.title }).click();
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await page.getByRole("combobox", { name: "کالا ردیف 1" }).click();
    await page.getByPlaceholder("کد یا نام کالا...").fill(code);
    await page.getByRole("button", { name: new RegExp(code) }).click();
    await page.getByLabel("تعداد ردیف 1").fill("6");

    await page.getByRole("button", { name: "تخصیص بچ (FEFO)" }).click();
    await expect(
      page.getByText("بچ‌ها به روش FEFO تخصیص داده شدند"),
    ).toBeVisible();

    // ۴ عدد از EARLY و ۲ عدد از LATE؛ OLD منقضی است
    await expect(page.getByLabel("بچ ردیف 1")).toHaveValue(String(earlyId));
    await expect(page.getByLabel("تعداد ردیف 1")).toHaveValue("4");
    await expect(page.getByLabel("بچ ردیف 2")).toHaveValue(String(lateId));
    await expect(page.getByLabel("تعداد ردیف 2")).toHaveValue("2");
    await expect(page.getByLabel("بچ ردیف 3")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "تخصیص بچ (FEFO)" }),
    ).toBeHidden();

    // سند با همان تخصیص ثبت و قطعی می‌شود
    const created = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/Inventory\/Inventory\/docs$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    expect((await created).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/inventory\/docs\/edit\/\d+$/);
    const docId = Number(page.url().split("/").pop());
    await approveAndPostDoc(api, docId);

    // باقی‌مانده: EARLY صفر، LATE هشت؛ پیشنهاد بعدی مستقیم از LATE است
    const next = await (
      await api.post("/api/Inventory/Inventory/batches/fefo", {
        data: { productId, warehouseId: warehouse.warehouseId, quantity: 20 },
      })
    ).json();
    expect(next.lines).toMatchObject([{ batchId: lateId, quantity: 8 }]);
    expect(next.shortage).toBe(12);
    await api.dispose();
  });
});
