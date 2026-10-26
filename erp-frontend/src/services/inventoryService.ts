// src/services/inventoryService.ts
import {
  ConfigureItemProfileCommand,
  CreateBatchCommand,
  CreateInventoryDocCommand,
  CreateLocationCommand,
  DefineWarehouseCommand,
  InventoryDocDto,
  ProductCardexDto,
  InventoryStockDto,
  WarehouseDto,
  SetBatchQcStatusCommand,
  SetItemWarehouseSettingCommand,
  StockRebuildResultDto,
  StockRebuildRowDto,
  UpdateBatchCommand,
  UpdateInventoryDocCommand,
  UpdateLocationCommand,
} from "@/types/inventory";
import type { StockValuationDto } from "@/types/api";
import apiClient from "@/lib/api/client";
import type {
  WarehouseUserDto,
  DefineInventoryDocTypeCommand,
  PagedQuery,
  Paged,
  UpdateInventoryDocTypeCommand,
  UpdateWarehouseCommand,
  InventorySerialDto,
  FefoAllocationDto,
  StockCountListItemDto,
  StockCountDto,
  CreateStockCountCommand,
  UpdateStockCountCommand,
  FinalizeStockCountCommand,
  FinalizeStockCountResult,
} from "@/types/api";

const BASE_URL = "/Inventory/Inventory";
const STOCK_COUNTS_URL = "/Inventory/StockCounts";
const BASE_INFO_URL = "/BaseInfo"; // آدرس ماژول اطلاعات پایه

const inventoryService = {
  // ==========================================
  // 1. Warehouses (انبارها)
  // ==========================================

  defineWarehouse: async (data: DefineWarehouseCommand) => {
    const response = await apiClient.post(`${BASE_URL}/warehouses`, data);
    return response.data;
  },

  // متد اصلی برای گرید (با پیجینیشن)
  getWarehouses: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<WarehouseDto>>(
      `${BASE_URL}/warehouses/list`,
      payload,
      { signal },
    );
    return response.data;
  },

  // ✅ متد جدید: دریافت لیست همه انبارها (برای Dropdown)
  // این متد مشکل Expected 1 arguments را در صفحات Create/Edit حل می‌کند
  getAllWarehouses: async () => {
    // فرض می‌کنیم تعداد انبارها خیلی زیاد نیست، ۱۰۰۰ تا می‌گیریم
    const payload = {
      pageNumber: 1,
      pageSize: 1000,
      orderBy: "Id",
      isDescending: false,
    };
    const response = await apiClient.post(
      `${BASE_URL}/warehouses/list`,
      payload,
    );
    // اگر خروجی PaginatedResult است، باید items را برگردانیم
    return response.data.items || [];
  },

  getWarehouseById: async (id: number | string) => {
    const response = await apiClient.get(`${BASE_URL}/warehouses/${id}`);
    return response.data;
  },

  deleteWarehouse: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/warehouses/${id}`, {
      params: { rowVersion },
    });
  },

  getWarehouseTypes: async () => {
    const response = await apiClient.get(`${BASE_URL}/warehouse-types`);
    return response.data;
  },

  updateWarehouse: async (id: number, data: UpdateWarehouseCommand) => {
    const response = await apiClient.put(`${BASE_URL}/warehouses/${id}`, data);
    return response.data;
  },

  // ==========================================
  // 2. Locations (لوکیشن‌ها)
  // ==========================================

  getLocations: async (warehouseId: number) => {
    const response = await apiClient.get(
      `${BASE_URL}/warehouses/${warehouseId}/locations`,
    );
    return response.data;
  },

  getLocationById: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/locations/${id}`);
    return response.data;
  },

  createLocation: async (data: CreateLocationCommand) => {
    const response = await apiClient.post(`${BASE_URL}/locations`, data);
    return response.data;
  },

  updateLocation: async (id: number, data: UpdateLocationCommand) => {
    const response = await apiClient.put(`${BASE_URL}/locations/${id}`, data);
    return response.data;
  },

  deleteLocation: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/locations/${id}`, {
      params: { rowVersion },
    });
  },

  // ==========================================
  // 3. Doc Types (انواع سند)
  // ==========================================

  // متد اصلی
  getDocTypes: async () => {
    const response = await apiClient.get(`${BASE_URL}/doc-types`);
    return response.data;
  },

  // ✅ متد کمکی: آلیایس برای هماهنگی با نام‌گذاری صفحات
  getAllDocTypes: async () => {
    const response = await apiClient.get(`${BASE_URL}/doc-types`);
    return response.data;
  },

  getDocTypeById: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/doc-types/${id}`);
    return response.data;
  },

  createDocType: async (data: DefineInventoryDocTypeCommand) => {
    const response = await apiClient.post(`${BASE_URL}/doc-types`, data);
    return response.data;
  },

  updateDocType: async (id: number, data: UpdateInventoryDocTypeCommand) => {
    const response = await apiClient.put(`${BASE_URL}/doc-types/${id}`, data);
    return response.data;
  },

  deleteDocType: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/doc-types/${id}`, {
      params: { rowVersion },
    });
  },

  // ==========================================
  // 4. Products Integration (اتصال به کالاها)
  // ==========================================

  // ✅ متد جدید: جستجوی کالا (حل خطای DocForm)
  // وصل می‌شود به ProductsController در BaseInfo
  searchProducts: async (payload: PagedQuery) => {
    const response = await apiClient.post(
      `${BASE_INFO_URL}/Products/search`,
      payload,
    );
    return response.data;
  },

  // ==========================================
  // 5. Enums & Helpers
  // ==========================================

  getNumberingScopes: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/numbering-scopes`);
    return response.data;
  },

  getInventoryNatures: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/inventory-natures`);
    return response.data;
  },

  getSystemEntities: async () => {
    const response = await apiClient.get(`${BASE_URL}/enums/system-entities`);
    return response.data;
  },

  // ==========================================
  // 6. Profiles & Settings
  // ==========================================

  getProductProfile: async (productId: number) => {
    const response = await apiClient.get(
      `${BASE_URL}/products/${productId}/profile`,
    );
    return response.data;
  },

  configureProductProfile: async (data: ConfigureItemProfileCommand) => {
    const response = await apiClient.post(`${BASE_URL}/products/profile`, data);
    return response.data;
  },

  setWarehouseSetting: async (data: SetItemWarehouseSettingCommand) => {
    const response = await apiClient.post(
      `${BASE_URL}/products/warehouse-settings`,
      data,
    );
    return response.data;
  },

  deleteWarehouseSetting: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/products/warehouse-settings/${id}`, {
      params: { rowVersion },
    });
  },

  // ==========================================
  // 7. Batches
  // ==========================================

  getProductBatches: async (productId: number, includeBlocked = false) => {
    const response = await apiClient.get(
      `${BASE_URL}/products/${productId}/batches`,
      {
        params: { includeBlocked },
      },
    );
    return response.data;
  },

  createBatch: async (data: CreateBatchCommand) => {
    const response = await apiClient.post(`${BASE_URL}/batches`, data);
    return response.data;
  },

  updateBatch: async (id: number, data: UpdateBatchCommand) => {
    const response = await apiClient.put(`${BASE_URL}/batches/${id}`, data);
    return response.data;
  },

  // دسترسی سطح داده: کاربران مجاز انبار
  getWarehouseUsers: async (warehouseId: number): Promise<WarehouseUserDto[]> => {
    const response = await apiClient.get<WarehouseUserDto[]>(`${BASE_URL}/warehouses/${warehouseId}/users`);
    return response.data;
  },

  setWarehouseUsers: async (warehouseId: number, userIds: string[]) => {
    await apiClient.put(`${BASE_URL}/warehouses/${warehouseId}/users`, userIds);
  },

  setBatchQc: async (id: number, data: SetBatchQcStatusCommand) => {
    const response = await apiClient.put(`${BASE_URL}/batches/${id}/qc`, data);
    return response.data;
  },

  // ==========================================
  // 8. Inventory Documents (اسناد)
  // ==========================================

  searchDocs: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<InventoryDocDto>>(
      `${BASE_URL}/docs/search`,
      payload,
      { signal },
    );
    return response.data;
  },

  getDocById: async (id: number | string) => {
    const response = await apiClient.get(`${BASE_URL}/docs/${id}`);
    return response.data as InventoryDocDto;
  },

  createDoc: async (data: CreateInventoryDocCommand) => {
    const response = await apiClient.post(`${BASE_URL}/docs`, data);
    return response.data;
  },

  updateDoc: async (id: number, data: UpdateInventoryDocCommand) => {
    const response = await apiClient.put(`${BASE_URL}/docs/${id}`, data);
    return response.data;
  },

  deleteDoc: async (id: number, rowVersion: string) => {
    return apiClient.delete(`${BASE_URL}/docs/${id}`, {
      params: { rowVersion },
    });
  },

  approveDoc: async (id: number, rowVersion: string) => {
    const response = await apiClient.post(`${BASE_URL}/docs/${id}/approve`, {
      id,
      rowVersion,
    });
    return response.data;
  },

  postDoc: async (id: number, rowVersion: string) => {
    const response = await apiClient.post(`${BASE_URL}/docs/${id}/post`, {
      id,
      rowVersion,
    });
    return response.data;
  },

  revertDoc: async (id: number) => {
    const response = await apiClient.post(`${BASE_URL}/docs/${id}/revert`, {
      id,
    });
    return response.data;
  },

  // ==========================================
  // 9. Reports & Stock (گزارشات و موجودی)
  // ==========================================

  // دریافت گزارش موجودی لحظه‌ای
  getCurrentStock: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<InventoryStockDto>>(
      `${BASE_URL}/stock/current`,
      payload,
      { signal },
    );
    return response.data;
  },

  // گزارش شماره سریال‌ها (کالای سریال‌دار)
  // پیشنهاد بچ و قفسه به روش FEFO برای سطر خروجی
  suggestFefo: async (payload: {
    productId: number;
    warehouseId: number;
    quantity: number;
    asOfDate?: string;
  }) => {
    const response = await apiClient.post<FefoAllocationDto>(
      `${BASE_URL}/batches/fefo`,
      payload,
    );
    return response.data;
  },

  // انبارگردانی
  searchStockCounts: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<StockCountListItemDto>>(
      `${STOCK_COUNTS_URL}/search`,
      payload,
      { signal },
    );
    return response.data;
  },
  getStockCount: async (id: number) => {
    const response = await apiClient.get<StockCountDto>(`${STOCK_COUNTS_URL}/${id}`);
    return response.data;
  },
  createStockCount: async (command: CreateStockCountCommand) => {
    const response = await apiClient.post<{ id: number }>(STOCK_COUNTS_URL, command);
    return response.data.id;
  },
  updateStockCount: async (id: number, command: UpdateStockCountCommand) => {
    await apiClient.put(`${STOCK_COUNTS_URL}/${id}`, command);
  },
  finalizeStockCount: async (id: number, command: FinalizeStockCountCommand) => {
    const response = await apiClient.post<FinalizeStockCountResult>(
      `${STOCK_COUNTS_URL}/${id}/finalize`,
      command,
    );
    return response.data;
  },

  searchSerials: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<InventorySerialDto>>(
      `${BASE_URL}/serials/search`,
      payload,
      { signal },
    );
    return response.data;
  },

  // اختلاف موجودی لحظه‌ای با جمع تراکنش‌ها (بدون تغییر داده)
  previewStockRebuild: async (): Promise<StockRebuildRowDto[]> => {
    const response = await apiClient.get<StockRebuildRowDto[]>(
      `${BASE_URL}/stock/rebuild/preview`,
    );
    return response.data;
  },

  rebuildStock: async (): Promise<StockRebuildResultDto> => {
    const response = await apiClient.post<StockRebuildResultDto>(
      `${BASE_URL}/stock/rebuild`,
    );
    return response.data;
  },

  /** ارزش ریالی موجودی از تراز میانگین موزون */
  getStockValuation: async (payload: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<StockValuationDto>>(`${BASE_URL}/reports/valuation`, payload, { signal })).data,

  getProductCardex: async (payload: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<ProductCardexDto>>(
      `${BASE_URL}/reports/cardex`,
      payload,
      { signal },
    );
    return response.data;
  },


  submitDoc: async (id: number) => {
    const response = await apiClient.post(`${BASE_URL}/docs/${id}/submit`);
    return response.data;
  },
};

export default inventoryService;
