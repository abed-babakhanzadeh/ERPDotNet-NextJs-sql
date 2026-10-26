import { expect, test } from "@playwright/test";
import { adminApi, createProduct, createUnit, ok, pickProduct, uid } from "./helpers";

const WORK_CENTERS = "/api/Production/WorkCenters";

test.describe("مسیر تولید و مراکز کاری", () => {
  test("مرکز کاری از فرم ثبت و در مسیر تولید فرمول استفاده می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const chair = await createProduct(api, { code: `CH-${tag}`, name: `صندلی ${tag}`, unitId, supplyType: 2 });
    const wood = await createProduct(api, { code: `WD-${tag}`, name: `چوب ${tag}`, unitId });

    // ۱. تعریف مرکز کاری از فهرست استاندارد
    await page.goto("/production/work-centers");
    await page.getByRole("button", { name: "مرکز کاری جدید" }).click();
    await page.getByLabel(/^کد/).fill(`WC${tag}`.slice(0, 20));
    await page.getByLabel(/^عنوان/).fill(`برش ${tag}`);
    await page.getByLabel(/^ساعت کاری روزانه/).fill("7.5");
    await page.getByRole("button", { name: "ثبت مرکز کاری" }).click();
    await expect(page.getByText("مرکز کاری با موفقیت ثبت شد")).toBeVisible();

    const found = await (await api.post(`${WORK_CENTERS}/search`, { data: { pageNumber: 1, pageSize: 5, searchTerm: `برش ${tag}` } })).json();
    const workCenter = found.items[0];
    expect(workCenter).toMatchObject({ title: `برش ${tag}`, hoursPerDay: 7.5, isActive: true });

    // کد تکراری با پیام فارسی رد می‌شود
    const duplicate = await api.post(WORK_CENTERS, { data: { code: workCenter.code, title: "دیگری", hoursPerDay: 8 } });
    expect(duplicate.status()).toBe(400);
    expect(await duplicate.text()).toContain("کد مرکز کاری تکراری است");

    // ۲. فرمول با مسیر دو عملیاتی
    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", `CH-${tag}`);
    await page.getByLabel("عنوان فرمول").fill(`صندلی ${tag}`);
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "ماده اولیه ردیف 1", `WD-${tag}`);
    await page.getByLabel("مقدار مصرفی ردیف 1").fill("4");

    await page.getByRole("tab", { name: /مسیر تولید/ }).click();
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await expect(page.getByLabel("ترتیب ردیف 1")).toHaveValue("10");
    await page.getByLabel("عنوان عملیات ردیف 1").fill("برش قطعات");
    await page.getByLabel("مرکز کاری عملیات 1").selectOption({ label: `${workCenter.code} - برش ${tag}` });
    await page.getByLabel("اجرا (دقیقه) ردیف 1").fill("3");
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await expect(page.getByLabel("ترتیب ردیف 2")).toHaveValue("20");
    await page.getByLabel("عنوان عملیات ردیف 2").fill("مونتاژ");

    // عملیات بدون مرکز کاری ثبت نمی‌شود
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(page.getByText("عملیات 2: مرکز کاری انتخاب نشده است.").first()).toBeVisible();

    await page.getByLabel("مرکز کاری عملیات 2").selectOption({ label: `${workCenter.code} - برش ${tag}` });
    await page.getByLabel("آماده‌سازی (دقیقه) ردیف 2").fill("15");
    const created = page.waitForResponse((r) => r.request().method() === "POST" && /\/ProductEngineering\/BOMs$/.test(r.url()));
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    const res = await created;
    expect(res.status()).toBeLessThan(300);
    const bomId = Number(await res.text());

    const bom = await (await api.get(`/api/ProductEngineering/BOMs/${bomId}`)).json();
    expect(bom.operations).toMatchObject([
      { sequence: 10, title: "برش قطعات", workCenterId: workCenter.id, workCenterTitle: `برش ${tag}`, setupMinutes: 0, runMinutes: 3 },
      { sequence: 20, title: "مونتاژ", workCenterId: workCenter.id, setupMinutes: 15, runMinutes: 0 },
    ]);

    // ویرایش فرمول عملیات را بارگذاری می‌کند
    await page.goto(`/product-engineering/boms/edit/${bomId}`);
    await page.getByRole("tab", { name: /مسیر تولید \(2\)/ }).click();
    await expect(page.getByLabel("عنوان عملیات ردیف 1")).toHaveValue("برش قطعات");

    // ۳. مرکز کاری در حال استفاده حذف نمی‌شود؛ مرکز غیرفعال در فرمول جدید پذیرفته نمی‌شود
    const del = await api.delete(`${WORK_CENTERS}/${workCenter.id}`);
    expect(del.status()).toBe(422);
    expect(await del.text()).toContain("مسیر تولید");
    await ok(
      await api.put(`${WORK_CENTERS}/${workCenter.id}`, {
        data: { id: workCenter.id, code: workCenter.code, title: workCenter.title, hoursPerDay: 7.5, isActive: false, rowVersion: workCenter.rowVersion },
      }),
      "غیرفعال کردن مرکز کاری",
    );
    const inactive = await api.post("/api/ProductEngineering/BOMs", {
      data: {
        productId: chair,
        title: `نسخه ۲ ${tag}`,
        version: 2,
        usage: 2,
        type: 1,
        fromDate: new Date().toISOString(),
        isActive: true,
        baseQuantity: 1,
        details: [{ childProductId: wood, quantity: 1, inputQuantity: 1, inputUnitId: unitId, wastePercentage: 0, substitutes: [] }],
        operations: [{ sequence: 10, title: "برش", workCenterId: workCenter.id, setupMinutes: 0, runMinutes: 1 }],
      },
    });
    expect(inactive.status()).toBe(400);
    expect(await inactive.text()).toContain("غیرفعال");

    await api.dispose();
  });
});
