import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createBom,
  createDoc,
  createDocType,
  createProduct,
  createUnit,
  createWarehouse,
  ok,
  uid,
} from "./helpers";

const ORDERS = "/api/Production/Orders";
const SETTINGS = "/api/Settings/InventoryValuation";

test.describe("بهای تمام‌شده سفارش تولید", () => {
  test("با مبنای «مواد و مراکز کاری»، کارکرد × نرخ ساعتی به بهای رسید محصول اضافه می‌شود", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const cake = await createProduct(api, {
      code: `PC-${tag}`,
      name: `کیک ریالی ${tag}`,
      unitId,
      supplyType: 2,
    });
    const flour = await createProduct(api, {
      code: `PF-${tag}`,
      name: `آرد ریالی ${tag}`,
      unitId,
    });
    const code = `PC${tag}`.slice(0, 20);
    const workCenter = await (
      await ok(
        await api.post("/api/Production/WorkCenters", {
          data: { code, title: `فر ${tag}`, hoursPerDay: 8, hourlyRate: 6000 },
        }),
        "مرکز کاری",
      )
    ).json();
    await createBom(api, {
      productId: cake,
      title: `فرمول ریالی ${tag}`,
      components: [{ productId: flour, unitId, quantity: 2 }],
      operations: [
        {
          sequence: 10,
          title: "پخت",
          workCenterId: workCenter.id,
          setupMinutes: 0,
          runMinutes: 6,
        },
      ],
    });
    const warehouse = await createWarehouse(api, tag);
    const purchase = await createDocType(api, `رسید خرید ${tag}`, 1, true);
    const issueType = await createDocType(api, `حواله تولید ${tag}`, 2);
    await approveAndPostDoc(
      api,
      await createDoc(api, {
        docTypeId: purchase,
        warehouseId: warehouse.warehouseId,
        lines: [
          {
            productId: flour,
            quantity: 20,
            locationId: warehouse.locationId,
            unitCost: 1000,
          },
        ],
      }),
    );

    const original = await (await api.get(SETTINGS)).json();
    const setBasis = async (productionCostBasis: number) => {
      const current = await (await api.get(SETTINGS)).json();
      await ok(
        await api.put(SETTINGS, { data: { ...current, productionCostBasis } }),
        "تنظیمات ارزش‌گذاری",
      );
    };
    await setBasis(2);
    try {
      // ۵ کیک = ۱۰ آرد × ۱۰۰۰ = ۱۰٬۰۰۰ ریال مواد
      const orderId = (
        await (
          await ok(
            await api.post(ORDERS, { data: { productId: cake, quantity: 5 } }),
            "ساخت سفارش",
          )
        ).json()
      ).id;
      await ok(await api.post(`${ORDERS}/${orderId}/release`), "تأیید سفارش");
      const order = await (await api.get(`${ORDERS}/${orderId}`)).json();
      const issueId: number = await (
        await ok(
          await api.post(`${ORDERS}/${orderId}/issue`, {
            data: {
              id: orderId,
              docTypeId: issueType,
              warehouseId: warehouse.warehouseId,
              locationId: warehouse.locationId,
              docDate: new Date().toISOString(),
              lines: [{ materialId: order.materials[0].id, quantity: 10 }],
            },
          }),
          "حواله مواد",
        )
      ).json();
      await approveAndPostDoc(api, issueId);

      // ۳۰ دقیقه × ۶۰۰۰ ریال در ساعت = ۳۰۰۰ ریال کارکرد؛ نرخ روی گزارش ثبت می‌شود
      const [operation] = await (
        await api.get(`${ORDERS}/${orderId}/operations`)
      ).json();
      await ok(
        await api.post(`${ORDERS}/${orderId}/operations/reports`, {
          data: {
            orderId,
            operationId: operation.id,
            reportDate: new Date().toISOString(),
            goodQuantity: 5,
            scrapQuantity: 0,
            setupMinutes: 0,
            runMinutes: 30,
          },
        }),
        "گزارش کارکرد",
      );
      // تغییر بعدی نرخ، کارکرد ثبت‌شده را عوض نمی‌کند
      const saved = await (
        await api.get(`/api/Production/WorkCenters/${workCenter.id}`)
      ).json();
      expect(saved.hourlyRate).toBe(6000);
      await ok(
        await api.put(`/api/Production/WorkCenters/${workCenter.id}`, {
          data: { ...saved, hourlyRate: 999999 },
        }),
        "تغییر نرخ",
      );

      const receiptId: number = await (
        await ok(
          await api.post(`${ORDERS}/${orderId}/receive`, {
            data: {
              id: orderId,
              docTypeId: purchase,
              warehouseId: warehouse.warehouseId,
              locationId: warehouse.locationId,
              docDate: new Date().toISOString(),
              quantity: 5,
              scrapQuantity: 0,
            },
          }),
          "رسید محصول",
        )
      ).json();
      await approveAndPostDoc(api, receiptId);

      // (۱۰٬۰۰۰ + ۳٬۰۰۰) ÷ ۵ = ۲٬۶۰۰
      const receipt = await (
        await api.get(`/api/Inventory/Inventory/docs/${receiptId}`)
      ).json();
      expect(receipt.details[0]).toMatchObject({
        postedUnitCost: 2600,
        postedTotalCost: 13000,
      });
      const cost = await (await api.get(`${ORDERS}/${orderId}/cost`)).json();
      expect(cost).toMatchObject({
        costBasis: 2,
        materialCost: 10000,
        conversionCost: 3000,
        orderCost: 13000,
        receivedValue: 13000,
        unabsorbedCost: 0,
        unitCost: 2600,
        operations: [
          expect.objectContaining({ title: "پخت", minutes: 30, cost: 3000 }),
        ],
      });

      await page.goto(`/production/orders/${orderId}`);
      await expect(page.getByText("بهای تمام‌شده")).toBeVisible();
      await expect(page.getByText("مواد + کارکرد")).toBeVisible();
      await expect(page.getByText("۲٬۶۰۰").first()).toBeVisible();
    } finally {
      await setBasis(original.productionCostBasis);
      await api.dispose();
    }
  });
});
