import apiClient from "@/lib/api/client";
import type {
  CreateProductionOrderCommand,
  GetMaterialPlanQuery,
  MaterialPlanDto,
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
  WorkCenterDto,
  WorkCenterLoadDto,
  WorkCenterOptionDto,
  ProductionOperationDto,
  ProductionOrderCostDto,
  ReportOperationCommand,
  CreateWorkCenterCommand,
  UpdateWorkCenterCommand,
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

  /** برنامه‌ریزی چندسطحی مواد و کسری سفارش‌های باز */
  planMaterials: async (query: Partial<GetMaterialPlanQuery>) =>
    (await apiClient.post<MaterialPlanDto>("/Production/Planning/materials", query)).data,

  /** عملیات سفارش با زمان برنامه و واقعی و گزارش‌های کارکرد */
  getCost: async (id: number) => (await apiClient.get<ProductionOrderCostDto>(`${ORDERS}/${id}/cost`)).data,

  getOperations: async (id: number) => (await apiClient.get<ProductionOperationDto[]>(`${ORDERS}/${id}/operations`)).data,

  reportOperation: async (command: ReportOperationCommand) =>
    (await apiClient.post<number>(`${ORDERS}/${command.orderId}/operations/reports`, command)).data,

  deleteOperationReport: async (orderId: number, reportId: number) => {
    await apiClient.delete(`${ORDERS}/${orderId}/operations/reports/${reportId}`);
  },

  completeOrder: async (id: number) => {
    await apiClient.post(`${ORDERS}/${id}/complete`);
  },
};

const WORK_CENTERS = "/Production/WorkCenters";

/** مراکز کاری تولید؛ امضای متدها مثل سرویس‌های اطلاعات پایه است تا همان صفحه فهرست استفاده شود */
export const workCenterService = {
  search: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<WorkCenterDto>>(`${WORK_CENTERS}/search`, query, { signal })).data,

  /** بار هر مرکز از عملیات سفارش‌های باز */
  load: async () => (await apiClient.get<WorkCenterLoadDto[]>(`${WORK_CENTERS}/load`)).data,

  /** همه مراکز (غیرفعال‌ها آخر) برای فرم مسیر تولید */
  options: async () => (await apiClient.get<WorkCenterOptionDto[]>(`${WORK_CENTERS}/options`)).data,

  getById: async (id: number) => (await apiClient.get<WorkCenterDto>(`${WORK_CENTERS}/${id}`)).data,

  /** شناسه مرکز جدید */
  create: async (command: CreateWorkCenterCommand) =>
    (await apiClient.post<{ id: number }>(WORK_CENTERS, command)).data.id,

  update: async (id: number, command: UpdateWorkCenterCommand) => {
    await apiClient.put(`${WORK_CENTERS}/${id}`, command);
  },

  remove: async (id: number) => {
    await apiClient.delete(`${WORK_CENTERS}/${id}`);
  },
};
