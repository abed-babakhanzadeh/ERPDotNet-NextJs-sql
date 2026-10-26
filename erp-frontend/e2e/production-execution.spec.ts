import { expect, test, type Page } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBom,
  createDoc,
  createDocType,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  ok,
  stockOf,
  uid,
} from "./helpers";

const ORDERS = "/api/Production/Orders";

async function choose(page: Page, combobox: string, option: string) {
  await page.getByRole("combobox", { name: combobox }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("اجرای سفارش تولید", () => {
  test("حواله مواد، رسید محصول و ضایعات با ارجاع به سفارش؛ پیشرفت از اسناد قطعی خوانده می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const cake = await createProduct(api, { code: `CK-${tag}`, name: `کیک ${tag}`, unitId, supplyType: 2 });
    const flour = await createProduct(api, { code: `FL-${tag}`, name: `آرد ${tag}`, unitId });
    await createBom(api, {
      productId: cake,
      title: `فرمول کیک ${tag}`,
      components: [{ productId: flour, unitId, quantity: 2 }],
    });
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    const issueType = `حواله تولید ${tag}`;
    await createDocType(api, issueType, 2);
    const stocked = await createDoc(api, {
      docTypeId: receipt.id,
      warehouseId: warehouse.warehouseId,
      lines: [{ productId: flour, quantity: 20, locationId: warehouse.locationId }],
    });
    await approveAndPostDoc(api, stocked);

    // ۵ کیک = ۱۰ آرد
    const orderId = (await (await ok(await api.post(ORDERS, { data: { productId: cake, quantity: 5 } }), "ساخت سفارش")).json()).id;
    const progress = async () => (await (await api.get(`${ORDERS}/${orderId}/progress`)).json());

    const order = await (await api.get(`${ORDERS}/${orderId}`)).json();
    const issueApi = (docTypeId: number) =>
      api.post(`${ORDERS}/${orderId}/issue`, {
        data: {
          id: orderId,
          docTypeId,
          warehouseId: warehouse.warehouseId,
          locationId: warehouse.locationId,
          docDate: new Date().toISOString(),
          lines: [{ materialId: order.materials[0].id, quantity: 1 }],
        },
      });

    // سفارش پیش‌نویس حواله نمی‌گیرد
    const early = await issueApi(receipt.id);
    expect(early.status()).toBe(422);
    expect(await early.text()).toContain("تأیید نشده");
    await ok(await api.post(`${ORDERS}/${orderId}/release`), "تأیید سفارش");
    // نوع سند حواله باید صادره باشد
    expect((await issueApi(receipt.id)).status()).toBe(422);

    // حواله مواد از صفحه سفارش؛ پیش‌فرض مقدار، نیاز کامل است
    await page.goto(`/production/orders/${orderId}`);
    await expect(page.getByRole("table", { name: "نیاز و مصرف مواد" })).toContainText("۱۰");
    await page.getByRole("button", { name: "حواله مواد" }).click();
    await choose(page, "نوع سند (صادره)", issueType);
    await choose(page, "انبار", warehouse.title);
    await choose(page, "قفسه پیش‌فرض", warehouse.locationTitle);
    const quantity = page.getByLabel(`مقدار حواله آرد ${tag}`);
    await expect(quantity).toHaveValue("10");
    await quantity.fill("8");
    const issued = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith(`/Orders/${orderId}/issue`));
    await page.getByRole("button", { name: "ساخت حواله" }).click();
    const issueDocId: number = await (await issued).json();
    await expect(page.getByText("حواله مواد پیش‌نویس ساخته شد")).toBeVisible();
    // سند پیش‌نویس در تب جدید باز می‌شود تا سطرها تکمیل شود
    await expect(page).toHaveURL(new RegExp(`/inventory/docs/edit/${issueDocId}$`));
    // سند انبار مرجع خود را نشان می‌دهد
    await expect(page.getByText(`این سند از سفارش تولید ${order.orderNumber} ساخته شده است.`)).toBeVisible();

    const issueDoc = await (await api.get(`/api/Inventory/Inventory/docs/${issueDocId}`)).json();
    expect(issueDoc).toMatchObject({ referenceEntityName: "ProductionOrder", referenceEntityId: orderId, status: 1 });
    let p = await progress();
    expect(p.materials[0]).toMatchObject({ requiredQuantity: 10, issuedQuantity: 0, pendingIssueQuantity: 8, remainingQuantity: 2 });

    // سفارش در حال تولید با سند زنده ابطال نمی‌شود
    expect((await api.post(`${ORDERS}/${orderId}/cancel`)).status()).toBe(422);

    await approveAndPostDoc(api, issueDocId);
    p = await progress();
    expect(p.materials[0]).toMatchObject({ issuedQuantity: 8, pendingIssueQuantity: 0, remainingQuantity: 2 });
    expect(await stockOf(api, flour, warehouse.warehouseId)).toBe(12);

    // رسید محصول و ضایعات از صفحه سفارش
    await page.goto(`/production/orders/${orderId}`);
    await expect(page.getByRole("heading", { name: new RegExp(order.orderNumber) })).toContainText("در حال تولید");
    await page.getByRole("button", { name: "رسید محصول" }).click();
    await choose(page, "نوع سند (وارده)", receipt.title);
    await choose(page, "انبار", warehouse.title);
    await choose(page, "قفسه محصول", warehouse.locationTitle);
    await expect(page.getByLabel(/^محصول سالم/)).toHaveValue("5");
    await page.getByLabel(/^محصول سالم/).fill("4");
    await page.getByLabel(/^ضایعات/).fill("1");
    const received = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith(`/Orders/${orderId}/receive`));
    await page.getByRole("button", { name: "ساخت رسید" }).click();
    const receiptDocId: number = await (await received).json();
    await expect(page.getByText("رسید محصول پیش‌نویس ساخته شد")).toBeVisible();

    // تا رسید قطعی نشده، سفارش تکمیل نمی‌شود
    const notYet = await api.post(`${ORDERS}/${orderId}/complete`);
    expect(notYet.status()).toBe(422);
    expect(await notYet.text()).toContain("قطعی‌نشده");

    await approveAndPostDoc(api, receiptDocId);
    p = await progress();
    expect(p).toMatchObject({ receivedQuantity: 4, scrapQuantity: 1, hasOpenDocs: false });
    expect(p.documents).toHaveLength(2);
    expect(await stockOf(api, cake, warehouse.warehouseId)).toBe(5);

    // تکمیل از صفحه سفارش، با تأیید
    await page.goto(`/production/orders/${orderId}`);
    await expect(page.getByRole("table", { name: "اسناد انبار سفارش" }).getByRole("row")).toHaveCount(3);
    await page.getByRole("button", { name: "تکمیل سفارش" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "تکمیل سفارش" }).click();
    await expect(page.getByText("سفارش تولید تکمیل شد")).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(order.orderNumber) })).toContainText("تکمیل شده");
    await expect(page.getByRole("button", { name: "حواله مواد" })).toHaveCount(0);

    // سفارش تکمیل‌شده سند جدید نمی‌گیرد
    const late = await api.post(`${ORDERS}/${orderId}/receive`, {
      data: { id: orderId, docTypeId: receipt.id, warehouseId: warehouse.warehouseId, locationId: warehouse.locationId, docDate: new Date().toISOString(), quantity: 1, scrapQuantity: 0 },
    });
    expect(late.status()).toBe(422);

    await api.dispose();
  });
});
