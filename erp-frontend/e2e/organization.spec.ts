import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  adminApi,
  createDocType,
  createProduct,
  createUnit,
  createWarehouse,
  uid,
} from "./helpers";

async function createCompany(api: APIRequestContext, tag: string): Promise<number> {
  const res = await api.post("/api/BaseInfo/Companies", {
    data: { code: `C${tag}`.slice(0, 20), title: `شرکت ${tag}` },
  });
  if (!res.ok()) throw new Error(`ساخت شرکت: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

async function createFiscalYear(
  api: APIRequestContext,
  y: { companyId: number; title: string; start: string; end: string },
): Promise<number> {
  const res = await api.post("/api/BaseInfo/FiscalYears", {
    data: { companyId: y.companyId, title: y.title, startDate: y.start, endDate: y.end },
  });
  if (!res.ok()) throw new Error(`ساخت سال مالی: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

/** روز شمسی یک تاریخ ISO با ارقام فارسی، مثل «۱» */
const persianDay = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric" }).format(new Date(iso));

/** تقویم فیلد تاریخ را باز می‌کند و یک روز از ماه جاری را انتخاب می‌کند */
async function pickDayOfCurrentMonth(page: Page, label: string, day: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page
    .locator(".rmdp-day:not(.rmdp-deactive):not(.rmdp-disabled) span", { hasText: new RegExp(`^${day}$`) })
    .first()
    .click();
  await expect(page.getByRole("button", { name: new RegExp(`^${label}: `) })).toBeVisible();
}

function waitForPost(page: Page, path: RegExp) {
  return page.waitForResponse((r) => r.request().method() === "POST" && path.test(r.url()));
}

test.describe("شرکت، سال مالی و مرکز هزینه", () => {
  test("شرکت از فرم ثبت می‌شود و شناسه ملی نادرست و کد تکراری رد می‌شوند", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();

    await page.goto("/base-info/companies/create");
    await page.getByLabel("کد شرکت").fill(`C${tag}`);
    await page.getByLabel("نام شرکت").fill(`شرکت نمونه ${tag}`);
    await page.getByLabel("شناسه ملی").fill("123");
    await page.getByRole("button", { name: "ثبت شرکت" }).click();
    await expect(page.getByText("شناسه ملی باید ۱۱ رقم باشد")).toBeVisible();

    await page.getByLabel("شناسه ملی").fill("10101234567");
    const created = waitForPost(page, /\/BaseInfo\/Companies$/);
    await page.getByRole("button", { name: "ثبت شرکت" }).click();
    const res = await created;
    expect(res.status(), await res.text()).toBeLessThan(300);
    const company = await (await api.get(`/api/BaseInfo/Companies/${(await res.json()).id}`)).json();
    expect(company).toMatchObject({ code: `C${tag}`, nationalId: "10101234567", isActive: true });

    await page.goto("/base-info/companies/create");
    await page.getByLabel("کد شرکت").fill(`C${tag}`);
    await page.getByLabel("نام شرکت").fill("تکراری");
    const duplicate = waitForPost(page, /\/BaseInfo\/Companies$/);
    await page.getByRole("button", { name: "ثبت شرکت" }).click();
    expect((await duplicate).status()).toBe(400);
    await expect(page.getByText("کد شرکت تکراری است.").first()).toBeVisible();
    await api.dispose();
  });

  test("سال مالی با تقویم شمسی ثبت می‌شود و بازه هم‌پوشان رد می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const companyId = await createCompany(api, tag);

    await page.goto("/base-info/fiscal-years/create");
    await page.getByRole("combobox", { name: "شرکت" }).click();
    await page.getByRole("option", { name: new RegExp(`شرکت ${tag}`) }).click();
    await page.getByLabel("عنوان سال مالی").fill(`سال ${tag}`);
    await pickDayOfCurrentMonth(page, "تاریخ شروع", "۱");
    await pickDayOfCurrentMonth(page, "تاریخ پایان", "۲۵");
    const created = waitForPost(page, /\/BaseInfo\/FiscalYears$/);
    await page.getByRole("button", { name: "ثبت سال مالی" }).click();
    const res = await created;
    expect(res.status(), await res.text()).toBeLessThan(300);

    const year = await (await api.get(`/api/BaseInfo/FiscalYears/${(await res.json()).id}`)).json();
    expect(year).toMatchObject({ companyId, title: `سال ${tag}`, status: 1 });
    // روز انتخاب‌شده در تقویم شمسی، بدون جابه‌جایی منطقه زمانی ذخیره می‌شود
    expect(persianDay(year.startDate)).toBe("۱");
    expect(persianDay(year.endDate)).toBe("۲۵");

    // سال دوم همان شرکت که با سال اول هم‌پوشانی دارد
    await page.goto("/base-info/fiscal-years/create");
    await page.getByRole("combobox", { name: "شرکت" }).click();
    await page.getByRole("option", { name: new RegExp(`شرکت ${tag}`) }).click();
    await page.getByLabel("عنوان سال مالی").fill(`سال دوم ${tag}`);
    await pickDayOfCurrentMonth(page, "تاریخ شروع", "۱۰");
    await pickDayOfCurrentMonth(page, "تاریخ پایان", "۲۸");
    const overlap = waitForPost(page, /\/BaseInfo\/FiscalYears$/);
    await page.getByRole("button", { name: "ثبت سال مالی" }).click();
    expect((await overlap).status()).toBe(400);
    await expect(page.getByText(`با سال مالی سال ${tag} هم‌پوشانی دارد`).first()).toBeVisible();
    await api.dispose();
  });

  test("سند انبار در سال مالی شرکتِ انبار ثبت می‌شود و در سال بسته قطعی نمی‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const companyId = await createCompany(api, tag);
    const now = new Date();
    const yearId = await createFiscalYear(api, {
      companyId,
      title: `۱۴۰۵-${tag}`,
      start: new Date(now.getTime() - 30 * 864e5).toISOString(),
      end: new Date(now.getTime() + 30 * 864e5).toISOString(),
    });
    const { warehouseId, locationId } = await createWarehouse(api, tag);

    // شرکت انبار از فرم انبار انتخاب می‌شود
    await page.goto(`/inventory/warehouses/edit/${warehouseId}`);
    await page.getByRole("combobox", { name: "شرکت" }).click();
    await page.getByRole("option", { name: `شرکت ${tag}` }).click();
    const put = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes(`/warehouses/${warehouseId}`));
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    expect((await put).status()).toBeLessThan(300);
    const warehouse = await (await api.get(`/api/Inventory/Inventory/warehouses/${warehouseId}`)).json();
    expect(warehouse.companyId).toBe(companyId);

    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, { code: `FY-${tag}`, name: `کالای سال ${tag}`, unitId });
    const docTypeId = await createDocType(api, `رسید سال ${tag}`, 1);
    const newDoc = (docDate: Date) =>
      api.post("/api/Inventory/Inventory/docs", {
        data: {
          docTypeId,
          warehouseId,
          docDate: docDate.toISOString(),
          details: [{ productId, mainUnitQuantity: 5, subUnitQuantity: 0, locationId }],
        },
      });

    const ok = await newDoc(now);
    expect(ok.status(), await ok.text()).toBeLessThan(300);
    const body = await ok.json();
    const docId: number = typeof body === "number" ? body : body.id;
    const doc = await (await api.get(`/api/Inventory/Inventory/docs/${docId}`)).json();
    expect(doc.fiscalYearId).toBe(yearId);

    const outside = await newDoc(new Date(now.getTime() + 60 * 864e5));
    expect(outside.status()).toBe(422);
    expect(await outside.text()).toContain("در هیچ سال مالی");

    // بستن سال از فرم ویرایش سال مالی
    await page.goto(`/base-info/fiscal-years/edit/${yearId}`);
    await page.getByRole("combobox", { name: "وضعیت" }).click();
    await page.getByRole("option", { name: "بسته شده" }).click();
    const close = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes(`/FiscalYears/${yearId}`));
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    expect((await close).status()).toBeLessThan(300);

    const approved = await (await api.get(`/api/Inventory/Inventory/docs/${docId}`)).json();
    const approve = await api.post(`/api/Inventory/Inventory/docs/${docId}/approve`, {
      data: { id: docId, rowVersion: approved.rowVersion },
    });
    expect(approve.status(), await approve.text()).toBeLessThan(300);
    const current = await (await api.get(`/api/Inventory/Inventory/docs/${docId}`)).json();
    const post = await api.post(`/api/Inventory/Inventory/docs/${docId}/post`, {
      data: { id: docId, rowVersion: current.rowVersion },
    });
    expect(post.status()).toBe(422);
    expect(await post.text()).toContain("بسته شده");
    await api.dispose();
  });

  test("مرکز هزینه درختی ثبت می‌شود و مرکزِ دارای زیرمجموعه حذف نمی‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();

    await page.goto("/base-info/cost-centers/create");
    await page.getByLabel("کد").fill(`P${tag}`);
    await page.getByLabel("عنوان").fill(`سالن تولید ${tag}`);
    const parentRes = waitForPost(page, /\/BaseInfo\/CostCenters$/);
    await page.getByRole("button", { name: "ثبت مرکز هزینه" }).click();
    const parentId = (await (await parentRes).json()).id;

    await page.goto("/base-info/cost-centers/create");
    await page.getByLabel("کد").fill(`L${tag}`);
    await page.getByLabel("عنوان").fill(`خط ۱ ${tag}`);
    await page.getByRole("combobox", { name: "مرکز والد" }).click();
    await page.getByRole("option", { name: `P${tag} - سالن تولید ${tag}` }).click();
    const childRes = waitForPost(page, /\/BaseInfo\/CostCenters$/);
    await page.getByRole("button", { name: "ثبت مرکز هزینه" }).click();
    const child = await (await api.get(`/api/BaseInfo/CostCenters/${(await (await childRes).json()).id}`)).json();
    expect(child).toMatchObject({ parentId, parentTitle: `سالن تولید ${tag}`, type: 1 });

    await page.goto("/base-info/cost-centers");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(tag);
    // ردیف زیرمجموعه هم عنوان والد را نشان می‌دهد؛ ردیف والد را با کدش پیدا می‌کنیم
    const row = page.getByRole("row").filter({ hasText: `P${tag}` });
    await row.getByRole("button", { name: "حذف" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("این مرکز هزینه زیرمجموعه دارد و قابل حذف نیست.").first()).toBeVisible();
    expect((await api.get(`/api/BaseInfo/CostCenters/${parentId}`)).status()).toBe(200);
    await api.dispose();
  });
});
