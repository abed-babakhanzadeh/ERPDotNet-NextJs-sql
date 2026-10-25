import { expect, test, type Page } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBatch,
  createDoc,
  createDocType,
  createProduct,
  createUnit,
  createWarehouse,
  stockOf,
  uid,
} from "./helpers";

async function pickRowProduct(page: Page, row: number, code: string) {
  await page.getByRole("combobox", { name: `کالا ردیف ${row}` }).click();
  await page.getByPlaceholder("کد یا نام کالا...").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
}

const docUrl = /\/Inventory\/Inventory\/docs(\/\d+)?$/;

test.describe("سند انبار", () => {
  test("سند انتقال با قفسه مقصد ثبت و پس از قطعی شدن موجودی را جابه‌جا می‌کند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const code = `TR-${tag}`;
    const productId = await createProduct(api, {
      code,
      name: `مهره ${tag}`,
      unitId,
    });
    const source = await createWarehouse(api, `مبدا${tag}`);
    const dest = await createWarehouse(api, `مقصد${tag}`);
    const receiptType = await createDocType(api, `رسید ${tag}`, 1);
    const transferTitle = `انتقال ${tag}`;
    const transferType = await createDocType(api, transferTitle, 3);

    // موجودی اولیه انبار مبدأ
    const receipt = await createDoc(api, {
      docTypeId: receiptType,
      warehouseId: source.warehouseId,
      lines: [{ productId, quantity: 10, locationId: source.locationId }],
    });
    await approveAndPostDoc(api, receipt);

    await page.goto("/inventory/docs/create");
    await page.getByRole("combobox", { name: "نوع سند" }).click();
    await page.getByRole("option", { name: transferTitle }).click();
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: source.title }).click();
    await page.getByRole("combobox", { name: "انبار مقصد" }).click();
    // انبار مبدأ نباید در فهرست مقصد باشد
    await expect(page.getByRole("option", { name: source.title })).toHaveCount(
      0,
    );
    await page.getByRole("option", { name: dest.title }).click();

    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickRowProduct(page, 1, code);
    await page.getByLabel("تعداد ردیف 1").fill("4");
    await page
      .getByLabel("شلف/قفسه ردیف 1")
      .selectOption({ label: source.locationTitle });

    // بدون قفسه مقصد ثبت نمی‌شود
    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && docUrl.test(r.url())) posted = true;
    });
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    await expect(
      page.getByText("ردیف 1: قفسه مقصد را انتخاب کنید."),
    ).toBeVisible();
    expect(posted).toBe(false);

    await page
      .getByLabel("قفسه مقصد ردیف 1")
      .selectOption({ label: dest.locationTitle });
    const created = page.waitForResponse(
      (r) => r.request().method() === "POST" && docUrl.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    expect((await created).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/inventory\/docs\/edit\/\d+$/);
    const docId = Number(page.url().split("/").pop());

    const doc = await (
      await api.get(`/api/Inventory/Inventory/docs/${docId}`)
    ).json();
    expect(doc).toMatchObject({
      docTypeId: transferType,
      warehouseId: source.warehouseId,
      destinationWarehouseId: dest.warehouseId,
    });
    expect(doc.details[0]).toMatchObject({
      productId,
      mainUnitQuantity: 4,
      locationId: source.locationId,
      destinationLocationId: dest.locationId,
    });

    await approveAndPostDoc(api, docId);
    expect(await stockOf(api, productId, source.warehouseId)).toBe(6);
    expect(await stockOf(api, productId, dest.warehouseId)).toBe(4);
    await api.dispose();
  });

  test("ویرایش سند پیش‌نویس: تغییر مقدار، افزودن و حذف سطر", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const aCode = `EA-${tag}`;
    const aId = await createProduct(api, {
      code: aCode,
      name: `کالای الف ${tag}`,
      unitId,
    });
    const bCode = `EB-${tag}`;
    const bId = await createProduct(api, {
      code: bCode,
      name: `کالای ب ${tag}`,
      unitId,
    });
    const cCode = `EC-${tag}`;
    const cId = await createProduct(api, {
      code: cCode,
      name: `کالای ج ${tag}`,
      unitId,
    });
    const wh = await createWarehouse(api, tag);
    const receiptType = await createDocType(api, `رسید ${tag}`, 1);
    const docId = await createDoc(api, {
      docTypeId: receiptType,
      warehouseId: wh.warehouseId,
      lines: [
        { productId: aId, quantity: 5, locationId: wh.locationId },
        { productId: bId, quantity: 3, locationId: wh.locationId },
      ],
    });

    await page.goto(`/inventory/docs/edit/${docId}`);
    await expect(
      page.getByRole("tab", { name: "اقلام سند (2)" }),
    ).toBeVisible();
    await expect(page.getByText("ذخیره نشده")).toHaveCount(0);

    await page.getByLabel("تعداد ردیف 1").fill("8");
    await page.getByRole("button", { name: "حذف ردیف 2" }).click();
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickRowProduct(page, 2, cCode);
    await page.getByLabel("تعداد ردیف 2").fill("2");
    await page
      .getByLabel("شلف/قفسه ردیف 2")
      .selectOption({ label: wh.locationTitle });
    await expect(page.getByText("ذخیره نشده")).toBeVisible();

    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === "PUT" && r.url().includes(`/docs/${docId}`),
    );
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    expect((await saved).status()).toBeLessThan(300);
    await expect(page.getByText("ذخیره نشده")).toHaveCount(0);

    const doc = await (
      await api.get(`/api/Inventory/Inventory/docs/${docId}`)
    ).json();
    const lines = Object.fromEntries(
      doc.details.map((d: { productId: number; mainUnitQuantity: number }) => [
        d.productId,
        d.mainUnitQuantity,
      ]),
    );
    expect(lines).toEqual({ [aId]: 8, [cId]: 2 });
    await api.dispose();
  });

  test("سند قطعی‌شده فقط‌خواندنی است", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, {
      code: `RO-${tag}`,
      name: `کالا ${tag}`,
      unitId,
    });
    const wh = await createWarehouse(api, tag);
    const receiptType = await createDocType(api, `رسید ${tag}`, 1);
    const docId = await createDoc(api, {
      docTypeId: receiptType,
      warehouseId: wh.warehouseId,
      lines: [{ productId, quantity: 1, locationId: wh.locationId }],
    });
    await approveAndPostDoc(api, docId);

    await page.goto(`/inventory/docs/edit/${docId}`);
    await expect(
      page.getByRole("tab", { name: "اقلام سند (1)" }),
    ).toBeVisible();
    await expect(page.getByLabel("تعداد ردیف 1")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "ذخیره تغییرات" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "افزودن سطر جدید" }),
    ).toHaveCount(0);
    await api.dispose();
  });

  test("پیش‌نویس فرم سند بعد از رفرش صفحه برمی‌گردد", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const code = `DR-${tag}`;
    await createProduct(api, { code, name: `کالا ${tag}`, unitId });
    const wh = await createWarehouse(api, tag);
    const typeTitle = `رسید ${tag}`;
    await createDocType(api, typeTitle, 1);

    await page.goto("/inventory/docs/create");
    await page.getByRole("combobox", { name: "نوع سند" }).click();
    await page.getByRole("option", { name: typeTitle }).click();
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: wh.title }).click();
    await page.getByLabel("طرف حساب").fill(`تامین‌کننده ${tag}`);
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickRowProduct(page, 1, code);
    await page.getByLabel("تعداد ردیف 1").fill("9");
    // ذخیره پیش‌نویس با تأخیر کوتاه انجام می‌شود
    await page.waitForTimeout(1500);

    await page.reload();
    await expect(page.getByRole("combobox", { name: "نوع سند" })).toContainText(
      typeTitle,
    );
    await expect(
      page.getByRole("combobox", { name: "انبار", exact: true }),
    ).toContainText(wh.title);
    await expect(page.getByLabel("طرف حساب")).toHaveValue(`تامین‌کننده ${tag}`);
    await expect(page.getByLabel("تعداد ردیف 1")).toHaveValue("9");
    await expect(
      page.getByRole("combobox", { name: "کالا ردیف 1" }),
    ).toContainText(code);
    await api.dispose();
  });

  test("اعتبارسنجی سند جدید: خطای فیلدهای سربرگ و قفسه ردیف", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const code = `VL-${tag}`;
    await createProduct(api, { code, name: `کالا ${tag}`, unitId });
    const wh = await createWarehouse(api, tag);
    const typeTitle = `رسید ${tag}`;
    await createDocType(api, typeTitle, 1);

    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && docUrl.test(r.url())) posted = true;
    });

    await page.goto("/inventory/docs/create");
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    // خطا زیر خود فیلد هم دیده می‌شود و به آن وصل است
    const docType = page.getByRole("combobox", { name: "نوع سند" });
    await expect(docType).toHaveAttribute("aria-invalid", "true");
    await expect(docType).toHaveAccessibleDescription(
      "نوع سند را انتخاب کنید.",
    );
    await expect(page.getByText("انبار را انتخاب کنید.")).toBeVisible();

    await docType.click();
    await page.getByRole("option", { name: typeTitle }).click();
    await expect(docType).not.toHaveAttribute("aria-invalid", "true");
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: wh.title }).click();

    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    await expect(
      page.getByText("لطفا حداقل یک قلم کالا وارد کنید."),
    ).toBeVisible();

    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickRowProduct(page, 1, code);
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    // بک‌اند سند بدون قفسه را رد می‌کند؛ فرم پیش از ارسال همین را می‌گوید
    await expect(page.getByText("ردیف 1: قفسه را انتخاب کنید.")).toBeVisible();
    expect(posted).toBe(false);
    await api.dispose();
  });
  test("بچ انتخاب‌شده در ردیف سند ذخیره و پس از قطعی شدن در موجودی دیده می‌شود", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const code = `BT-${tag}`;
    const productId = await createProduct(api, {
      code,
      name: `رنگ ${tag}`,
      unitId,
    });
    const batchId = await createBatch(api, {
      productId,
      unitId,
      batchNumber: `LOT-${tag}`,
    });
    const warehouse = await createWarehouse(api, tag);
    const docTypeTitle = `رسید بچ ${tag}`;
    await createDocType(api, docTypeTitle, 1);

    await page.goto("/inventory/docs/create");
    await page.getByRole("combobox", { name: "نوع سند" }).click();
    await page.getByRole("option", { name: docTypeTitle }).click();
    await page.getByRole("combobox", { name: "انبار", exact: true }).click();
    await page.getByRole("option", { name: warehouse.title }).click();
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickRowProduct(page, 1, code);
    await page.getByLabel("تعداد ردیف 1").fill("5");
    await page
      .getByLabel("شلف/قفسه ردیف 1")
      .selectOption({ label: warehouse.locationTitle });
    await page.getByLabel("بچ ردیف 1").selectOption({ label: `LOT-${tag}` });

    const created = page.waitForResponse(
      (r) => r.request().method() === "POST" && docUrl.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    expect((await created).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/inventory\/docs\/edit\/\d+$/);
    const docId = Number(page.url().split("/").pop());

    const doc = await (
      await api.get(`/api/Inventory/Inventory/docs/${docId}`)
    ).json();
    expect(doc.details[0]).toMatchObject({
      batchId,
      batchNumber: `LOT-${tag}`,
    });
    // صفحه ویرایش همان بچ را نشان می‌دهد
    await expect(page.getByLabel("بچ ردیف 1")).toHaveValue(String(batchId));

    await approveAndPostDoc(api, docId);
    const res = await api.post("/api/Inventory/Inventory/stock/current", {
      data: {
        productId,
        warehouseId: warehouse.warehouseId,
        pageNumber: 1,
        pageSize: 50,
        sortColumn: "",
        sortDescending: false,
        excludeZeroBalances: true,
      },
    });
    const { items } = await res.json();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantityOnHand: 5 });
    expect(JSON.stringify(items[0])).toContain(`LOT-${tag}`);
    await api.dispose();
  });
  test("کالای بچ‌دار بدون بچ قطعی نمی‌شود", async () => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, {
      code: `NB-${tag}`,
      name: `چسب ${tag}`,
      unitId,
    });
    await createBatch(api, { productId, unitId, batchNumber: `LOT-${tag}` });
    const warehouse = await createWarehouse(api, tag);
    const docTypeId = await createDocType(api, `رسید بی‌بچ ${tag}`, 1);
    const docId = await createDoc(api, {
      docTypeId,
      warehouseId: warehouse.warehouseId,
      lines: [{ productId, quantity: 3, locationId: warehouse.locationId }],
    });

    await expect(approveAndPostDoc(api, docId)).rejects.toThrow(/مدیریت بچ/);
    expect(await stockOf(api, productId, warehouse.warehouseId)).toBe(0);
    await api.dispose();
  });
});
