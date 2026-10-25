import { request, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:5000";
export const ADMIN = { username: "admin", password: "Admin@1234" };
export const AUTH_FILE = "e2e/.auth/admin.json";

/** پسوند یکتا تا اجرای دوباره روی همان دیتابیس با داده قبلی تداخل نکند */
export const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

export async function loginToken(): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/Auth/login", { data: ADMIN });
  if (!res.ok()) throw new Error(`ورود admin ناموفق بود: ${res.status()} ${await res.text()}`);
  const { token } = await res.json();
  await ctx.dispose();
  return token;
}

/** کلاینت API با توکن admin؛ برای ساخت داده پیش‌نیاز و بررسی نتیجه در دیتابیس */
export async function adminApi(): Promise<APIRequestContext> {
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  const token = state.origins[0].localStorage.find((i: { name: string }) => i.name === "accessToken").value;
  return request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

/** داده پیش‌نیاز از راه API؛ هر تابع شناسه رکورد ساخته‌شده را برمی‌گرداند */
export async function createUnit(api: APIRequestContext, title: string): Promise<number> {
  const res = await api.post("/api/BaseInfo/Units", {
    data: { title, symbol: title.slice(-10), precision: 0, baseUnitId: null, conversionFactor: 1 },
  });
  if (!res.ok()) throw new Error(`ساخت واحد: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

export async function createProduct(
  api: APIRequestContext,
  p: { code: string; name: string; unitId: number; supplyType?: 1 | 2 | 3 },
): Promise<number> {
  const res = await api.post("/api/BaseInfo/Products", {
    data: { ...p, supplyType: p.supplyType ?? 1, conversions: [] },
  });
  if (!res.ok()) throw new Error(`ساخت کالا: ${res.status()} ${await res.text()}`);
  return (await res.json()).id;
}

async function postId(api: APIRequestContext, url: string, data: unknown, what: string): Promise<number> {
  const res = await api.post(url, { data });
  if (!res.ok()) throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  // بعضی endpointها شیء {id} و بعضی خود عدد را برمی‌گردانند
  return typeof body === "number" ? body : body.id;
}

/** انبار با یک قفسه؛ سطرهای سند انبار بدون قفسه ثبت نمی‌شوند */
export async function createWarehouse(api: APIRequestContext, tag: string) {
  const warehouseId = await postId(
    api,
    "/api/Inventory/Inventory/warehouses",
    { title: `انبار ${tag}`, code: `W${tag}`.slice(0, 20), type: 1, isActive: true },
    "ساخت انبار",
  );
  const locationId = await postId(
    api,
    "/api/Inventory/Inventory/locations",
    { warehouseId, title: `قفسه ${tag}`, code: `L${tag}`.slice(0, 20), parentId: null },
    "ساخت قفسه",
  );
  return { warehouseId, locationId, title: `انبار ${tag}`, locationTitle: `قفسه ${tag}` };
}

/** نوع سند رسید (ماهیت وارده) */
export async function createReceiptDocType(api: APIRequestContext, tag: string) {
  const title = `رسید ${tag}`;
  const id = await postId(
    api,
    "/api/Inventory/Inventory/doc-types",
    { title, nature: 1, affectsCost: false, numberingScope: 1, isReferenceRequired: false, allowedReferenceEntityNames: [] },
    "ساخت نوع سند",
  );
  return { id, title };
}

/** تأیید و قطعی کردن سند؛ این دو مرحله در برنامه از کارتابل گردش کار انجام می‌شوند */
export async function approveAndPostDoc(api: APIRequestContext, id: number) {
  for (const step of ["approve", "post"]) {
    const doc = await (await api.get(`/api/Inventory/Inventory/docs/${id}`)).json();
    const res = await api.post(`/api/Inventory/Inventory/docs/${id}/${step}`, { data: { id, rowVersion: doc.rowVersion } });
    if (!res.ok()) throw new Error(`${step} سند: ${res.status()} ${await res.text()}`);
  }
}

export async function createBom(
  api: APIRequestContext,
  b: { productId: number; title: string; components: { productId: number; unitId: number; quantity: number }[] },
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
      details: b.components.map((c) => ({
        childProductId: c.productId,
        quantity: c.quantity,
        inputQuantity: c.quantity,
        inputUnitId: c.unitId,
        wastePercentage: 0,
        substitutes: [],
      })),
    },
    "ساخت BOM",
  );
}
