import apiClient from "@/lib/api/client";
import type {
  CreateProductionOrderCommand,
  IssueProductionMaterialsCommand,
  Paged,
  PagedQuery,
  ProductionBomOptionDto,
  ProductionOrderDto,
  ProductionOrderListDto,
  ProductionOrderProgressDto,
  ProductionRequirementsDto,
  ProductionVarianceSummaryDto,
  ReceiveProductionOutputCommand,
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

  /** مصرف مواد، محصول و ضایعات از روی اسناد انبار مرتبط با سفارش */
  getProgress: async (id: number) => (await apiClient.get<ProductionOrderProgressDto>(`${ORDERS}/${id}/progress`)).data,

  /** شناسه سند حواله پیش‌نویس */
  issueMaterials: async (command: IssueProductionMaterialsCommand) =>
    (await apiClient.post<number>(`${ORDERS}/${command.id}/issue`, command)).data,

  /** شناسه سند رسید پیش‌نویس */
  receiveOutput: async (command: ReceiveProductionOutputCommand) =>
    (await apiClient.post<number>(`${ORDERS}/${command.id}/receive`, command)).data,

  /** گزارش انحراف مصرف مواد؛ فقط سفارش‌های در حال تولید و تکمیل‌شده */
  searchVariance: async (query: PagedQuery & { status?: number | null; overAllowedOnly?: boolean }, signal?: AbortSignal) =>
    (await apiClient.post<Paged<ProductionVarianceSummaryDto>>(`${ORDERS}/variance`, query, { signal })).data,

  completeOrder: async (id: number) => {
    await apiClient.post(`${ORDERS}/${id}/complete`);
  },
};
