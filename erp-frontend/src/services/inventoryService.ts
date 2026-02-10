// src/services/inventoryService.ts
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

  // سایر متدها که بعدا در فرم استفاده می‌شوند
  getDocById: (id: number | string) => apiClient.get(`${BASE_URL}/docs/${id}`),

  createDoc: (data: any) => apiClient.post(`${BASE_URL}/docs`, data),

  updateDoc: (id: number, data: any) =>
    apiClient.put(`${BASE_URL}/docs/${id}`, data),
};

export default inventoryService;
