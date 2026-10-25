import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBatch,
  createDoc,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  stockOf,
  uid,
} from "./helpers";

/** تأیید و قطعی کردن سند؛ پاسخ مرحلهٔ post برمی‌گردد تا خطای QC بررسی شود */
async function approveAndTryPost(api: APIRequestContext, id: number) {
  const get = async () =>
    (await api.get(`/api/Inventory/Inventory/docs/${id}`)).json();
  const approved = await api.post(
    `/api/Inventory/Inventory/docs/${id}/approve`,
    { data: { id, rowVersion: (await get()).rowVersion } },
  );
  expect(approved.ok()).toBeTruthy();
  return api.post(`/api/Inventory/Inventory/docs/${id}/post`, {
    data: { id, rowVersion: (await get()).rowVersion },
  });
}

async function issueDocType(
  api: APIRequestContext,
  title: string,
  allowsUnreleasedBatches: boolean,
) {
  const res = await api.post("/api/Inventory/Inventory/doc-types", {
    data: {
      title,
      nature: 2,
      affectsCost: false,
      numberingScope: 1,
      isReferenceRequired: false,
      allowedReferenceEntityNames: [],
      allowsUnreleasedBatches,
    },
  });
  expect(res.ok()).toBeTruthy();
  return Number(await res.text());
}

test.describe("کنترل کیفیت بچ", () => {
  test("بچ کالای نیازمند QC قرنطینه است، تا تأیید QC قابل حواله نیست و نوع سند مجاز بچ مردود را خارج می‌کند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیسه ${tag}`);
    const productId = await createProduct(api, {
      code: `RAW-${tag}`,
      name: `ماده اولیه ${tag}`,
      unitId,
    });
    const goodNumber = `QC-OK-${tag}`;
    const goodId = await createBatch(api, {
      productId,
      unitId,
      batchNumber: goodNumber,
      requiresQc: true,
    });
    const badId = await createBatch(api, {
      productId,
      unitId,
      batchNumber: `QC-BAD-${tag}`,
      requiresQc: true,
    });

    const batches = await (
      await api.get(
        `/api/Inventory/Inventory/products/${productId}/batches?includeBlocked=true`,
      )
    ).json();
    expect(batches.map((b: { qcStatus: number }) => b.qcStatus)).toEqual([
      2, 2,
    ]);

    // رسید بچ قرنطینه مجاز است
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    const line = (batchId: number, quantity: number) => ({
      productId,
      quantity,
      locationId: warehouse.locationId,
      batchId,
    });
    const receiptId = await createDoc(api, {
      docTypeId: receipt.id,
      warehouseId: warehouse.warehouseId,
      lines: [line(goodId, 10), line(badId, 5)],
    });
    await approveAndPostDoc(api, receiptId);

    // حوالهٔ عادی بچ قرنطینه رد می‌شود
    const normalIssue = await issueDocType(api, `حواله ${tag}`, false);
    const issueId = await createDoc(api, {
      docTypeId: normalIssue,
      warehouseId: warehouse.warehouseId,
      lines: [line(goodId, 4)],
    });
    const blocked = await approveAndTryPost(api, issueId);
    expect(blocked.status()).toBe(422);
    expect(await blocked.text()).toContain("قرنطینه");

    // تأیید QC از تب بچ‌های کالا
    await page.goto(`/base-info/products/edit/${productId}`);
    await page.getByRole("tab", { name: "مدیریت بچ‌ها" }).click();
    await page
      .getByRole("button", { name: `کنترل کیفیت بچ ${goodNumber}` })
      .click();
    await page.getByRole("combobox", { name: "نتیجهٔ کنترل کیفیت" }).click();
    await page.getByRole("option", { name: "تأیید شده" }).click();
    await page.getByLabel("یادداشت QC").fill("آزمون آزمایشگاه قبول");
    await page.getByRole("button", { name: "ثبت نتیجه" }).click();
    await expect(page.getByText("وضعیت کنترل کیفیت ثبت شد")).toBeVisible();
    const goodRow = page.getByRole("row").filter({ hasText: goodNumber });
    await expect(goodRow.getByText("تأیید شده")).toBeVisible();

    // حالا همان سند قطعی می‌شود
    const posted = await api.post(
      `/api/Inventory/Inventory/docs/${issueId}/post`,
      {
        data: {
          id: issueId,
          rowVersion: (
            await (await api.get(`/api/Inventory/Inventory/docs/${issueId}`)).json()
          ).rowVersion,
        },
      },
    );
    expect(posted.ok()).toBeTruthy();

    // مردودی بدون یادداشت پذیرفته نیست
    const noNote = await api.put(
      `/api/Inventory/Inventory/batches/${badId}/qc`,
      { data: { id: badId, qcStatus: 3 } },
    );
    expect(noNote.ok()).toBeFalsy();
    const rejected = await api.put(
      `/api/Inventory/Inventory/batches/${badId}/qc`,
      { data: { id: badId, qcStatus: 3, note: "آلودگی" } },
    );
    expect(rejected.ok()).toBeTruthy();

    // برگشت به تأمین‌کننده بچ مردود را خارج می‌کند
    const returnType = await issueDocType(api, `برگشت ${tag}`, true);
    const returnId = await createDoc(api, {
      docTypeId: returnType,
      warehouseId: warehouse.warehouseId,
      lines: [line(badId, 5)],
    });
    await approveAndPostDoc(api, returnId);
    expect(await stockOf(api, productId, warehouse.warehouseId)).toBe(6);
    await api.dispose();
  });
});
