// src/services/inventoryService.ts
import {
  CreateLocationCommand,
  DefineWarehouseCommand,
  UpdateLocationCommand,
} from "@/types/inventory";
import apiClient from "./apiClient";

const BASE_URL = "/Inventory/Inventory";

const inventoryService = {
  // حذف سند
  deleteDoc: async (id: number, rowVersion: string) => {
    // طبق بک‌ند، rowVersion در کوئری استرینگ ارسال می‌شود
    return apiClient.delete(`${BASE_URL}/docs/${id}`, {
      params: { rowVersion },
    });
  },

  // تعریف انبار جدید
  defineWarehouse: async (data: DefineWarehouseCommand) => {
    const response = await apiClient.post(`${BASE_URL}/warehouses`, data);
    return response.data;
  },

  // دریافت لیست انبارها با فیلتر و صفحه‌بندی
  getWarehouses: async (payload: any) => {
    const response = await apiClient.post(
      `${BASE_URL}/warehouses/list`,
      payload,
    );
    return response.data;
  },

  // دریافت اطلاعات یک انبار
  getWarehouseById: async (id: number | string) => {
    const response = await apiClient.get(`${BASE_URL}/warehouses/${id}`);
    return response.data;
  },

  // حذف منطقی انبار
  deleteWarehouse: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/warehouses/${id}`, {
      params: { rowVersion },
    });
  },

  // دریافت انواع انبار از بک‌اند برای نمایش در Combo
  getWarehouseTypes: async () => {
    const response = await apiClient.get(`${BASE_URL}/warehouse-types`);
    return response.data;
  },

  // ویرایش انبار
  updateWarehouse: async (id: number, data: any) => {
    const response = await apiClient.put(`${BASE_URL}/warehouses/${id}`, data);
    return response.data;
  },

  // سایر متدها که بعدا در فرم استفاده می‌شوند
  getDocById: (id: number | string) => apiClient.get(`${BASE_URL}/docs/${id}`),

  createDoc: (data: any) => apiClient.post(`${BASE_URL}/docs`, data),

  updateDoc: (id: number, data: any) =>
    apiClient.put(`${BASE_URL}/docs/${id}`, data),

  // === Locations Methods ===

  // دریافت لیست تمام لوکیشن‌های یک انبار (به صورت فلت که بعدا درختی می‌شود)
  getLocations: async (warehouseId: number) => {
    const response = await apiClient.get(
      `${BASE_URL}/warehouses/${warehouseId}/locations`,
    );
    return response.data;
  },

  // دریافت یک لوکیشن خاص برای ویرایش
  getLocationById: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/locations/${id}`);
    return response.data;
  },

  // ایجاد لوکیشن جدید
  createLocation: async (data: CreateLocationCommand) => {
    const response = await apiClient.post(`${BASE_URL}/locations`, data);
    return response.data;
  },

  // ویرایش لوکیشن
  updateLocation: async (id: number, data: UpdateLocationCommand) => {
    const response = await apiClient.put(`${BASE_URL}/locations/${id}`, data);
    return response.data;
  },

  // حذف لوکیشن (با کنترل همروندی)
  deleteLocation: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/locations/${id}`, {
      params: { rowVersion },
    });
  },

  // === Doc Types Methods ===

  getDocTypes: async () => {
    const response = await apiClient.get(`${BASE_URL}/doc-types`);
    return response.data;
  },

  getDocTypeById: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/doc-types/${id}`);
    return response.data;
  },

  createDocType: async (data: any) => {
    // تایپ DefineDocTypeCommand
    const response = await apiClient.post(`${BASE_URL}/doc-types`, data);
    return response.data;
  },

  updateDocType: async (id: number, data: any) => {
    // تایپ UpdateDocTypeCommand
    const response = await apiClient.put(`${BASE_URL}/doc-types/${id}`, data);
    return response.data;
  },

  deleteDocType: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/doc-types/${id}`, {
      params: { rowVersion },
    });
  },

  // دریافت لیست Enumها برای پر کردن کمبوها
  getNumberingScopes: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/numbering-scopes`);
    return response.data; // آرایه‌ای از {key, value} برمی‌گرداند
  },

  getInventoryNatures: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/inventory-natures`);
    return response.data;
  },
  // دریافت لیست موجودیت‌های سیستم برای عطف
  getSystemEntities: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/system-entities`);
    return response.data;
  },
};

export default inventoryService;
