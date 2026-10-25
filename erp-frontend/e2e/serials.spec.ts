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
  makeSerialManaged,
  serialsOf,
  uid,
} from "./helpers";

test.describe("شماره سریال", () => {
  test("رسید کالای سریال‌دار از فرم با سریال ثبت می‌شود و سریال‌ها در گزارش دیده می‌شوند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `دستگاه ${tag}`);
    const code = `LAP-${tag}`;
    const productId = await createProduct(api, {
      code,
      name: `لپ‌تاپ ${tag}`,
      unitId,
    });
    await makeSerialManaged(api, { productId, unitId });
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
    await page.getByLabel("تعداد ردیف 1").fill("2");
    await page
      .getByLabel("شلف/قفسه ردیف 1")
      .selectOption({ label: warehouse.locationTitle });

    // ستون سریال فقط برای کالای سریال‌دار ظاهر می‌شود
    const serials = page.getByLabel("شماره سریال‌ها ردیف 1");
    await serials.fill(`SN-${tag}-1`);
    await page.getByRole("button", { name: "ثبت اولیه" }).click();
    await expect(
      page.getByText(/2 شماره سریال لازم است/).first(),
    ).toBeVisible();

    await serials.fill(`SN-${tag}-1, SN-${tag}-2`);
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
    expect(doc.details[0].serialNumbers).toEqual([
      `SN-${tag}-1`,
      `SN-${tag}-2`,
    ]);

    await approveAndPostDoc(api, docId);
    expect(await serialsOf(api, productId)).toMatchObject([
      {
        serialNumber: `SN-${tag}-1`,
        statusId: 1,
        warehouseId: warehouse.warehouseId,
      },
      {
        serialNumber: `SN-${tag}-2`,
        statusId: 1,
        warehouseId: warehouse.warehouseId,
      },
    ]);

    await page.goto("/inventory/reports/serials");
    await page.getByRole("combobox", { name: "انبار" }).click();
    await page.getByRole("option", { name: warehouse.title }).click();
    const row = page.getByRole("row").filter({ hasText: `SN-${tag}-1` });
    await expect(row).toContainText("در انبار");
    await expect(row).toContainText(code);
    await api.dispose();
  });

  test("حواله فقط سریال موجود در همان انبار را خارج می‌کند و ابطالش آن را برمی‌گرداند", async () => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `دستگاه ${tag}`);
    const productId = await createProduct(api, {
      code: `PH-${tag}`,
      name: `گوشی ${tag}`,
      unitId,
    });
    await makeSerialManaged(api, { productId, unitId });
    const warehouse = await createWarehouse(api, tag);
    const receiptType = await createDocType(api, `رسید ${tag}`, 1);
    const issueType = await createDocType(api, `حواله ${tag}`, 2);
    const line = { productId, quantity: 1, locationId: warehouse.locationId };

    const receipt = await createDoc(api, {
      docTypeId: receiptType,
      warehouseId: warehouse.warehouseId,
      lines: [{ ...line, serialNumbers: [`IMEI-${tag}`] }],
    });
    await approveAndPostDoc(api, receipt);

    // سریالی که هرگز وارد انبار نشده خارج نمی‌شود
    const wrong = await createDoc(api, {
      docTypeId: issueType,
      warehouseId: warehouse.warehouseId,
      lines: [{ ...line, serialNumbers: [`OTHER-${tag}`] }],
    });
    await expect(approveAndPostDoc(api, wrong)).rejects.toThrow(
      /post سند: 422/,
    );

    const issue = await createDoc(api, {
      docTypeId: issueType,
      warehouseId: warehouse.warehouseId,
      lines: [{ ...line, serialNumbers: [`IMEI-${tag}`] }],
    });
    await approveAndPostDoc(api, issue);
    expect(await serialsOf(api, productId)).toMatchObject([
      { serialNumber: `IMEI-${tag}`, statusId: 2, warehouseId: null },
    ]);

    const revert = await api.post(
      `/api/Inventory/Inventory/docs/${issue}/revert`,
      { data: { id: issue } },
    );
    expect(revert.ok()).toBeTruthy();
    expect(await serialsOf(api, productId)).toMatchObject([
      {
        serialNumber: `IMEI-${tag}`,
        statusId: 1,
        warehouseId: warehouse.warehouseId,
      },
    ]);
    await api.dispose();
  });
});
