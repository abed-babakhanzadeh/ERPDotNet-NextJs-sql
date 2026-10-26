import apiClient from "@/lib/api/client";
import type {
  CreateProductionOrderCommand,
  Paged,
  PagedQuery,
  ProductionBomOptionDto,
  ProductionOrderDto,
  ProductionOrderListDto,
  ProductionRequirementsDto,
  UpdateProductionOrderCommand,
} from "@/types/api";

const ORDERS = "/Production/Orders";

export const productionService = {
  searchOrders: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<ProductionOrderListDto>>(`${ORDERS}/search`, query, { signal })).data,

  getOrder: async (id: number) => (await apiClient.get<ProductionOrderDto>(`${ORDERS}/${id}`)).data,

  /** فرمول‌های قابل انتخاب؛ اولی فرمول پیش‌فرض است */
  getBoms: async (productId: number) =>
    (await apiClient.get<ProductionBomOptionDto[]>(`${ORDERS}/boms`, { params: { productId } })).data,

  previewRequirements: async (productId: number, bomHeaderId: number | null, quantity: number) =>
    (
      await apiClient.post<ProductionRequirementsDto>(`${ORDERS}/requirements`, {
        productId,
        bomHeaderId,
        quantity,
      })
    ).data,

  /** شناسه سفارش جدید */
  createOrder: async (command: CreateProductionOrderCommand) =>
    (await apiClient.post<{ id: number }>(ORDERS, command)).data.id,

  updateOrder: async (id: number, command: UpdateProductionOrderCommand) => {
    await apiClient.put(`${ORDERS}/${id}`, command);
  },

  releaseOrder: async (id: number) => {
    await apiClient.post(`${ORDERS}/${id}/release`);
  },

  cancelOrder: async (id: number) => {
    await apiClient.post(`${ORDERS}/${id}/cancel`);
  },

  removeOrder: async (id: number) => {
    await apiClient.delete(`${ORDERS}/${id}`);
  },
};
