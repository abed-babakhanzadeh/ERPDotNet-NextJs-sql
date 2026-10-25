import { expect, test } from "@playwright/test";
import {
  adminApi,
  approveAndPostDoc,
  createDoc,
  createProduct,
  createReceiptDocType,
  createUnit,
  createUserWithRole,
  createWarehouse,
  uid,
} from "./helpers";

// مشاهده انبار، اسناد (ثبت/مشاهده) و گزارش موجودی و کاردکس
const KEEPER_PERMISSIONS = [3101, 3102, 3201, 3202, 3208, 3300, 3301, 3302];

test.describe("دسترسی سطح داده به انبار", () => {
  test("انباردار پس از تخصیص فقط انبار، اسناد و موجودی انبار خودش را می‌بیند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, {
      code: `ACL-${tag}`,
      name: `کالا ${tag}`,
      unitId,
    });
    const own = await createWarehouse(api, `${tag}a`);
    const other = await createWarehouse(api, `${tag}b`);
    const receipt = await createReceiptDocType(api, tag);
    const receiptIn = async (w: typeof own, quantity: number) => {
      const id = await createDoc(api, {
        docTypeId: receipt.id,
        warehouseId: w.warehouseId,
        lines: [{ productId, quantity, locationId: w.locationId }],
      });
      await approveAndPostDoc(api, id);
      return id;
    };
    const ownDoc = await receiptIn(own, 5);
    const otherDoc = await receiptIn(other, 7);
    const keeper = await createUserWithRole(api, tag, "Keeper", KEEPER_PERMISSIONS);

    // پیش از تخصیص، کاربر بدون محدودیت است
    const visibleWarehouses = async () =>
      (
        await (
          await keeper.api.post("/api/Inventory/Inventory/warehouses/list", {
            data: { pageNumber: 1, pageSize: 500 },
          })
        ).json()
      ).items.map((w: { id: number }) => w.id);
    expect(await visibleWarehouses()).toContain(other.warehouseId);

    // admin انبار اول را از فهرست انبارها به انباردار می‌دهد
    await page.goto("/inventory/warehouses");
    await page.getByLabel("جستجو در همه ستون‌ها").fill(own.title);
    await page.getByRole("button", { name: `کاربران مجاز ${own.title}` }).click();
    await page.getByLabel("جستجوی کاربر").fill(tag);
    await page.getByRole("checkbox", { name: new RegExp(`Keeper ${tag}`) }).check();
    await page.getByRole("button", { name: "ذخیره دسترسی" }).click();
    await expect(page.getByText("کاربران مجاز انبار ذخیره شد")).toBeVisible();

    // فهرست انبارها و اسناد محدود می‌شود
    const warehouses = await visibleWarehouses();
    expect(warehouses).toContain(own.warehouseId);
    expect(warehouses).not.toContain(other.warehouseId);

    const docs = (
      await (
        await keeper.api.post("/api/Inventory/Inventory/docs/search", {
          data: { pageNumber: 1, pageSize: 500 },
        })
      ).json()
    ).items.map((d: { id: number }) => d.id);
    expect(docs).toContain(ownDoc);
    expect(docs).not.toContain(otherDoc);
    expect((await keeper.api.get(`/api/Inventory/Inventory/docs/${otherDoc}`)).status()).toBe(403);

    // موجودی کلی فقط انبار خودش؛ درخواست صریح انبار دیگر رد می‌شود
    const stock = await (
      await keeper.api.post("/api/Inventory/Inventory/stock/current", {
        data: { productId, pageNumber: 1, pageSize: 50, sortColumn: "", sortDescending: false, excludeZeroBalances: true },
      })
    ).json();
    expect(stock.items.map((i: { warehouseTitle: string }) => i.warehouseTitle)).toEqual([own.title]);
    const otherStock = await keeper.api.post("/api/Inventory/Inventory/stock/current", {
      data: { productId, warehouseId: other.warehouseId, pageNumber: 1, pageSize: 50 },
    });
    expect(otherStock.status()).toBe(403);

    // ثبت سند در انبار غیرمجاز رد می‌شود
    const forbidden = await keeper.api.post("/api/Inventory/Inventory/docs", {
      data: {
        docTypeId: receipt.id,
        warehouseId: other.warehouseId,
        docDate: new Date().toISOString(),
        details: [{ productId, mainUnitQuantity: 1, subUnitQuantity: 0, locationId: other.locationId, serialNumbers: [] }],
      },
    });
    expect(forbidden.status()).toBe(403);

    // صفحه اسناد انباردار هم فقط سند انبار خودش را دارد
    const keeperContext = await page.context().browser()!.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(page.url()).origin,
            localStorage: [{ name: "accessToken", value: keeper.token }],
          },
        ],
      },
    });
    const keeperPage = await keeperContext.newPage();
    await keeperPage.goto("/inventory/docs");
    await expect(keeperPage.getByRole("cell", { name: own.title }).first()).toBeVisible();
    await expect(keeperPage.getByRole("cell", { name: other.title })).toHaveCount(0);
    await keeperContext.close();

    await Promise.all([api.dispose(), keeper.api.dispose()]);
  });
});
