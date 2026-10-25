import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createDoc,
  createDocType,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  stockOf,
  uid,
} from "./helpers";

test.describe("انبارگردانی", () => {
  test("شمارش، کالای پیداشده و نهایی کردن؛ اضافی و کسری سند اصلاحی می‌شوند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const product = (prefix: string) =>
      createProduct(api, {
        code: `${prefix}-${tag}`,
        name: `کالای ${prefix} ${tag}`,
        unitId,
      });
    const a = await product("A");
    const b = await product("B");
    const c = await product("C");
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    const receiptId = await createDoc(api, {
      docTypeId: receipt.id,
      warehouseId: warehouse.warehouseId,
      lines: [
        { productId: a, quantity: 10, locationId: warehouse.locationId },
        { productId: b, quantity: 5, locationId: warehouse.locationId },
      ],
    });
    await approveAndPostDoc(api, receiptId);
    const shortageTitle = `کسری ${tag}`;
    await createDocType(api, shortageTitle, 2);

    // شروع: موجودی فعلی مبنا می‌شود
    await page.goto("/inventory/stock-counts");
    await page.getByRole("button", { name: "شروع انبارگردانی" }).click();
    await page.getByRole("combobox", { name: "انبار" }).click();
    await page.getByRole("option", { name: warehouse.title }).click();
    await page.getByRole("button", { name: "شروع شمارش" }).click();
    await expect(page).toHaveURL(/\/inventory\/stock-counts\/\d+$/);
    const countId = Number(page.url().split("/").pop());

    await expect(page.getByText(`A-${tag}`)).toBeVisible();
    await expect(page.getByText(`B-${tag}`)).toBeVisible();

    // تا همه سطرها شمرده نشده‌اند، نهایی نمی‌شود
    await page.getByLabel("شمارش ردیف 1").fill("12");
    await page.getByRole("button", { name: "نهایی کردن" }).click();
    await expect(page.getByText("1 سطر هنوز شمرده نشده است")).toBeVisible();
    await page.getByRole("button", { name: "انصراف" }).click();

    await page.getByLabel("شمارش ردیف 2").fill("4");
    // کالایی که در سیستم نبود ولی در انبار پیدا شد
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await page.getByRole("combobox", { name: "کالا ردیف 3" }).click();
    await page.getByPlaceholder("کد یا نام کالا...").fill(`C-${tag}`);
    await page.getByRole("button", { name: new RegExp(`C-${tag}`) }).click();
    await page
      .getByLabel("قفسه ردیف 3")
      .selectOption({ label: warehouse.locationTitle });
    await page.getByLabel("شمارش ردیف 3").fill("3");
    await expect(page.getByText("+2")).toBeVisible();

    // «نهایی کردن» اول هم تغییرات را ذخیره کرده بود؛ پس به پاسخ همین ذخیره نگاه می‌کنیم نه پیام
    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === "PUT" &&
        r.url().endsWith(`/StockCounts/${countId}`),
    );
    await page.getByRole("button", { name: "ذخیره شمارش" }).click();
    expect((await saved).status()).toBeLessThan(300);

    await page.getByRole("button", { name: "نهایی کردن" }).click();
    await expect(page.getByText("2 سطر اضافی و 1 سطر کسری")).toBeVisible();
    await page.getByRole("combobox", { name: "نوع سند اضافی (وارده)" }).click();
    await page.getByRole("option", { name: receipt.title }).click();
    await page.getByRole("combobox", { name: "نوع سند کسری (صادره)" }).click();
    await page.getByRole("option", { name: shortageTitle }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "نهایی کردن" })
      .click();
    await expect(page.getByText("انبارگردانی نهایی شد")).toBeVisible();
    await expect(page.getByText("نهایی شده").first()).toBeVisible();
    await expect(page.getByLabel("شمارش ردیف 1")).toBeDisabled();

    const count = await (
      await api.get(`/api/Inventory/StockCounts/${countId}`)
    ).json();
    expect(count.surplusDocId).toBeTruthy();
    expect(count.shortageDocId).toBeTruthy();
    const surplus = await (
      await api.get(`/api/Inventory/Inventory/docs/${count.surplusDocId}`)
    ).json();
    expect(
      surplus.details
        .map((d: { productId: number; mainUnitQuantity: number }) => [
          d.productId,
          d.mainUnitQuantity,
        ])
        .sort((x: number[], y: number[]) => x[0] - y[0]),
    ).toEqual([
      [a, 2],
      [c, 3],
    ]);

    // اسناد اصلاحی مثل هر سند دیگر تأیید و قطعی می‌شوند
    await approveAndPostDoc(api, count.surplusDocId);
    await approveAndPostDoc(api, count.shortageDocId);
    expect(await stockOf(api, a, warehouse.warehouseId)).toBe(12);
    expect(await stockOf(api, b, warehouse.warehouseId)).toBe(4);
    expect(await stockOf(api, c, warehouse.warehouseId)).toBe(3);

    // انبارگردانی نهایی‌شده دوباره نهایی نمی‌شود
    const again = await api.post(
      `/api/Inventory/StockCounts/${countId}/finalize`,
      { data: { id: countId } },
    );
    expect(again.status()).toBe(422);
    await api.dispose();
  });
});
