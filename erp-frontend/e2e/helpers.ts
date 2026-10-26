import {
  request,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";
import fs from "node:fs";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:5000";
export const ADMIN = { username: "admin", password: "Admin@1234" };
export const AUTH_FILE = "e2e/.auth/admin.json";

/** پسوند یکتا تا اجرای دوباره روی همان دیتابیس با داده قبلی تداخل نکند */
export const uid = () =>
  `${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

export async function loginToken(): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/Auth/login", { data: ADMIN });
  if (!res.ok())
    throw new Error(
      `ورود admin ناموفق بود: ${res.status()} ${await res.text()}`,
    );
  const { token } = await res.json();
  await ctx.dispose();
  return token;
}

/** کلاینت API با توکن admin؛ برای ساخت داده پیش‌نیاز و بررسی نتیجه در دیتابیس */
export async function adminApi(): Promise<APIRequestContext> {
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  const token = state.origins[0].localStorage.find(
    (i: { name: string }) => i.name === "accessToken",
  ).value;
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** داده پیش‌نیاز از راه API؛ هر تابع شناسه رکورد ساخته‌شده را برمی‌گرداند */
export async function createUnit(
  api: APIRequestContext,
  title: string,
): Promise<number> {
  const res = await api.post("/api/BaseInfo/Units", {
    data: {
      title,
      symbol: title.slice(-10),
      precision: 0,
      baseUnitId: null,
      conversionFactor: 1,
    },
  });
  if (!res.ok())
    throw new Error(`ساخت واحد: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

export async function createProduct(
  api: APIRequestContext,
  p: { code: string; name: string; unitId: number; supplyType?: 1 | 2 | 3 },
): Promise<number> {
  const res = await api.post("/api/BaseInfo/Products", {
    data: { ...p, supplyType: p.supplyType ?? 1, conversions: [] },
  });
  if (!res.ok())
    throw new Error(`ساخت کالا: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

async function postId(
  api: APIRequestContext,
  url: string,
  data: unknown,
  what: string,
): Promise<number> {
  const res = await api.post(url, { data });
  if (!res.ok())
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  // بعضی endpointها شیء {id} و بعضی خود عدد را برمی‌گردانند
  return typeof body === "number" ? body : body.id;
}

/** انبار با یک قفسه؛ سطرهای سند انبار بدون قفسه ثبت نمی‌شوند */
export async function createWarehouse(api: APIRequestContext, tag: string) {
  const warehouseId = await postId(
    api,
    "/api/Inventory/Inventory/warehouses",
    {
      title: `انبار ${tag}`,
      code: `W${tag}`.slice(0, 20),
      type: 1,
      isActive: true,
    },
    "ساخت انبار",
  );
  const locationId = await postId(
    api,
    "/api/Inventory/Inventory/locations",
    {
      warehouseId,
      title: `قفسه ${tag}`,
      code: `L${tag}`.slice(0, 20),
      parentId: null,
    },
    "ساخت قفسه",
  );
  return {
    warehouseId,
    locationId,
    title: `انبار ${tag}`,
    locationTitle: `قفسه ${tag}`,
  };
}

/** نوع سند رسید (ماهیت وارده) */
export async function createReceiptDocType(
  api: APIRequestContext,
  tag: string,
) {
  const title = `رسید ${tag}`;
  const id = await postId(
    api,
    "/api/Inventory/Inventory/doc-types",
    {
      title,
      nature: 1,
      affectsCost: false,
      numberingScope: 1,
      isReferenceRequired: false,
      allowedReferenceEntityNames: [],
    },
    "ساخت نوع سند",
  );
  return { id, title };
}

/** تأیید و قطعی کردن سند؛ این دو مرحله در برنامه از کارتابل گردش کار انجام می‌شوند */
export async function approveAndPostDoc(api: APIRequestContext, id: number) {
  for (const step of ["approve", "post"]) {
    const doc = await (
      await api.get(`/api/Inventory/Inventory/docs/${id}`)
    ).json();
    const res = await api.post(`/api/Inventory/Inventory/docs/${id}/${step}`, {
      data: { id, rowVersion: doc.rowVersion },
    });
    if (!res.ok())
      throw new Error(`${step} سند: ${res.status()} ${await res.text()}`);
  }
}

export async function createBom(
  api: APIRequestContext,
  b: {
    productId: number;
    title: string;
    components: { productId: number; unitId: number; quantity: number; wastePercentage?: number }[];
    baseQuantity?: number;
  },
): Promise<number> {
  return postId(
    api,
    "/api/ProductEngineering/BOMs",
    {
      productId: b.productId,
      title: b.title,
      version: 1,
      usage: 1,
      type: 1,
      fromDate: new Date().toISOString(),
      toDate: null,
      isActive: true,
      baseQuantity: b.baseQuantity ?? 1,
      details: b.components.map((c) => ({
        childProductId: c.productId,
        quantity: c.quantity,
        inputQuantity: c.quantity,
        inputUnitId: c.unitId,
        wastePercentage: c.wastePercentage ?? 0,
        substitutes: [],
      })),
    },
    "ساخت BOM",
  );
}

/** نوع سند؛ پیش‌فرض غیرریالی تا تست‌ها بهای واحد لازم نداشته باشند */
export async function createDocType(
  api: APIRequestContext,
  title: string,
  nature: 1 | 2 | 3,
  affectsCost = false,
): Promise<number> {
  return postId(
    api,
    "/api/Inventory/Inventory/doc-types",
    {
      title,
      nature,
      affectsCost,
      numberingScope: 1,
      isReferenceRequired: false,
      allowedReferenceEntityNames: [],
    },
    "ساخت نوع سند",
  );
}

export async function createDoc(
  api: APIRequestContext,
  d: {
    docTypeId: number;
    warehouseId: number;
    destinationWarehouseId?: number;
    lines: {
      productId: number;
      quantity: number;
      locationId: number;
      destinationLocationId?: number;
      batchId?: number;
      serialNumbers?: string[];
      unitCost?: number;
    }[];
  },
): Promise<number> {
  return postId(
    api,
    "/api/Inventory/Inventory/docs",
    {
      docTypeId: d.docTypeId,
      warehouseId: d.warehouseId,
      destinationWarehouseId: d.destinationWarehouseId ?? null,
      docDate: new Date().toISOString(),
      details: d.lines.map((l) => ({
        productId: l.productId,
        mainUnitQuantity: l.quantity,
        subUnitQuantity: 0,
        locationId: l.locationId,
        destinationLocationId: l.destinationLocationId ?? null,
        batchId: l.batchId ?? null,
        serialNumbers: l.serialNumbers ?? [],
        unitCost: l.unitCost ?? null,
      })),
    },
    "ساخت سند",
  );
}

/** موجودی یک کالا در یک انبار (جمع همه قفسه‌ها) */
export async function stockOf(
  api: APIRequestContext,
  productId: number,
  warehouseId: number,
): Promise<number> {
  const res = await api.post("/api/Inventory/Inventory/stock/current", {
    data: {
      productId,
      warehouseId,
      pageNumber: 1,
      pageSize: 50,
      sortColumn: "",
      sortDescending: false,
      excludeZeroBalances: true,
    },
  });
  const { items } = await res.json();
  return items.reduce(
    (sum: number, i: { quantityOnHand: number }) => sum + i.quantityOnHand,
    0,
  );
}

/** کالا را بچ‌دار می‌کند و یک بچ برایش می‌سازد */
export async function createBatch(
  api: APIRequestContext,
  p: {
    productId: number;
    unitId: number;
    batchNumber: string;
    expiryDate?: Date;
    /** بچ‌های کالای نیازمند QC در وضعیت قرنطینه ساخته می‌شوند */
    requiresQc?: boolean;
  },
): Promise<number> {
  const profile = await api.post("/api/Inventory/Inventory/products/profile", {
    data: {
      productId: p.productId,
      isBatchManaged: true,
      isSerialManaged: false,
      requiresQc: p.requiresQc ?? false,
      mainInventoryUnitId: p.unitId,
    },
  });
  if (!profile.ok())
    throw new Error(
      `تنظیم بچ کالا: ${profile.status()} ${await profile.text()}`,
    );
  const res = await api.post("/api/Inventory/Inventory/batches", {
    data: {
      productId: p.productId,
      batchNumber: p.batchNumber,
      expiryDate: p.expiryDate?.toISOString() ?? null,
    },
  });
  if (!res.ok())
    throw new Error(`ساخت بچ: ${res.status()} ${await res.text()}`);
  return Number(await res.text());
}

/** کالا را سریال‌دار می‌کند */
export async function makeSerialManaged(
  api: APIRequestContext,
  p: { productId: number; unitId: number },
) {
  const res = await api.post("/api/Inventory/Inventory/products/profile", {
    data: {
      productId: p.productId,
      isBatchManaged: false,
      isSerialManaged: true,
      mainInventoryUnitId: p.unitId,
    },
  });
  if (!res.ok())
    throw new Error(`سریال‌دار کردن کالا: ${res.status()} ${await res.text()}`);
}

/** شماره سریال‌های یک کالا از گزارش سریال */
export async function serialsOf(api: APIRequestContext, productId: number) {
  const res = await api.post("/api/Inventory/Inventory/serials/search", {
    data: { productId, pageNumber: 1, pageSize: 100 },
  });
  if (!res.ok())
    throw new Error(`گزارش سریال: ${res.status()} ${await res.text()}`);
  return (await res.json()).items as {
    serialNumber: string;
    statusId: number;
    warehouseId: number | null;
  }[];
}

/** پاسخ ناموفق را با متن خطای سرور پرتاب می‌کند */
/** انتخاب کالا در جستجوی جدولی؛ پنجره جستجو آخرین dialog صفحه است */
export async function pickProduct(page: Page, combobox: string, code: string) {
  await page.getByRole("combobox", { name: combobox }).click();
  await page.getByRole("dialog").last().getByRole("textbox").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
}

/** منتظر پاسخ ذخیره فرم (برای خواندن شناسه رکورد ساخته‌شده) */
export function waitForSave(page: Page, method: "POST" | "PUT", path: RegExp) {
  return page.waitForResponse((r) => r.request().method() === method && path.test(r.url()));
}

export async function ok(res: APIResponse, what: string): Promise<APIResponse> {
  if (!res.ok())
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  return res;
}

/** نقش با مجوزهای داده‌شده و کاربری با همان نقش؛ کلاینت API با توکن خود کاربر برمی‌گردد */
export async function createUserWithRole(
  api: APIRequestContext,
  tag: string,
  name: string,
  permissionIds: number[],
) {
  const roleName = `${name}-${tag}`;
  const role = await (
    await ok(
      await api.post("/api/Roles", { data: { name: roleName } }),
      "ساخت نقش",
    )
  ).json();
  await ok(
    await api.post("/api/Permissions/assign-role", {
      data: { roleId: role.id, permissionIds },
    }),
    "دسترسی نقش",
  );
  const username = `${name.toLowerCase()}${tag}`;
  const password = "Passw0rd!x";
  const user = await (
    await ok(
      await api.post("/api/Users", {
        data: {
          firstName: name,
          lastName: tag,
          username,
          email: `${username}@e2e.local`,
          password,
          roles: [roleName],
        },
      }),
      "ساخت کاربر",
    )
  ).json();
  const login = await (
    await ok(
      await (
        await request.newContext({ baseURL: API_URL })
      ).post("/api/Auth/login", {
        data: { username, password },
      }),
      "ورود کاربر",
    )
  ).json();
  const client = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${login.token}` },
  });
  return {
    id: user.id as string,
    roleId: role.id as string,
    fullName: `${name} ${tag}`,
    token: login.token as string,
    api: client,
  };
}
