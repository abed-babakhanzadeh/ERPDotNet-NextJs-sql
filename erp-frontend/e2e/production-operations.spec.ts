import { expect, test } from "@playwright/test";
import { adminApi, createProduct, createUnit, ok, uid } from "./helpers";

const ORDERS = "/api/Production/Orders";

test.describe("عملیات سفارش تولید و گزارش کارکرد", () => {
  test("عملیات از مسیر فرمول کپی، کارکرد از صفحه سفارش ثبت و در بار مرکز کاری دیده می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const chair = await createProduct(api, { code: `CH-${tag}`, name: `صندلی ${tag}`, unitId, supplyType: 2 });
    const wood = await createProduct(api, { code: `WD-${tag}`, name: `چوب ${tag}`, unitId });
    const code = `S${tag}`.slice(0, 20);
    const workCenterId = (await (await ok(await api.post("/api/Production/WorkCenters", { data: { code, title: `اره ${tag}`, hoursPerDay: 8 } }), "مرکز کاری")).json()).id;
    // فرمول برای ۱۰ صندلی: برش ۱۵ دقیقه آماده‌سازی و ۶۰ دقیقه اجرا
    await ok(
      await api.post("/api/ProductEngineering/BOMs", {
        data: {
          productId: chair,
          title: `صندلی ${tag}`,
          version: 1,
          usage: 1,
          type: 1,
          fromDate: new Date(Date.now() - 86400000).toISOString(),
          isActive: true,
          baseQuantity: 10,
          details: [{ childProductId: wood, quantity: 4, inputQuantity: 4, inputUnitId: unitId, wastePercentage: 0, substitutes: [] }],
          operations: [{ sequence: 10, title: "برش", workCenterId, setupMinutes: 15, runMinutes: 60 }],
        },
      }),
      "ساخت فرمول",
    );

    // سفارش ۲۰ صندلی: اجرا ۱۲۰ دقیقه
    const orderId = (await (await ok(await api.post(ORDERS, { data: { productId: chair, quantity: 20 } }), "ساخت سفارش")).json()).id;
    const operations = await (await api.get(`${ORDERS}/${orderId}/operations`)).json();
    expect(operations).toMatchObject([{ sequence: 10, title: "برش", workCenterId, plannedSetupMinutes: 15, plannedRunMinutes: 120 }]);

    // سفارش پیش‌نویس کارکرد نمی‌گیرد
    const early = await api.post(`${ORDERS}/${orderId}/operations/reports`, {
      data: { orderId, operationId: operations[0].id, reportDate: new Date().toISOString(), goodQuantity: 1, scrapQuantity: 0, setupMinutes: 0, runMinutes: 1 },
    });
    expect(early.status()).toBe(422);
    await ok(await api.post(`${ORDERS}/${orderId}/release`), "تأیید سفارش");

    await page.goto(`/production/orders/${orderId}`);
    await expect(page.getByRole("table", { name: "عملیات سفارش" })).toContainText(`اره ${tag}`);
    await page.getByRole("button", { name: "ثبت کارکرد عملیات برش" }).click();
    // آماده‌سازی برنامه در اولین گزارش پیش‌فرض است
    await expect(page.getByLabel(/^آماده‌سازی/)).toHaveValue("15");
    await page.getByLabel(/^مقدار سالم/).fill("10");
    await page.getByLabel(/^اجرا/).fill("60");
    await page.getByRole("button", { name: "ثبت کارکرد", exact: true }).click();
    await expect(page.getByText("کارکرد ثبت شد")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("در حال تولید");
    await expect(page.getByRole("table", { name: "گزارش‌های کارکرد" })).toContainText("برش");

    // ۱۰ از ۲۰ در ۷۵ دقیقه: استاندارد ۱۵ + ۶۰ = ۷۵ ← کارایی ۱۰۰٪؛ ۶۰ دقیقه اجرا مانده
    const after = await (await api.get(`${ORDERS}/${orderId}/operations`)).json();
    expect(after[0]).toMatchObject({ goodQuantity: 10, earnedMinutes: 75, efficiencyPercent: 100, remainingMinutes: 60, progressPercent: 50 });

    const load = await (await api.get("/api/Production/WorkCenters/load")).json();
    expect(load.find((l: { id: number }) => l.id === workCenterId)).toMatchObject({ openOrderCount: 1, remainingMinutes: 60, loadDays: 0.13 });
    await page.goto("/production/work-centers/load");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(code);
    await expect(page.getByRole("row").filter({ hasText: `اره ${tag}` })).toContainText("۰٫۱۳ روز");

    // حذف گزارش اشتباه
    await page.goto(`/production/orders/${orderId}`);
    await page.getByRole("button", { name: /^حذف کارکرد برش/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("گزارش کارکرد حذف شد")).toBeVisible();
    await expect(page.getByRole("table", { name: "گزارش‌های کارکرد" })).toHaveCount(0);

    await api.dispose();
  });
});
