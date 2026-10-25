import apiClient from "@/lib/api/client";
import type {
  BOMDto,
  BOMListDto,
  BOMTreeNodeDto,
  CopyBOMCommand,
  CreateBOMCommand,
  GetWhereUsedQuery,
  PagedQuery,
  Paged,
  UpdateBOMCommand,
  WhereUsedDto,
} from "@/types/api";

const BOMS = "/ProductEngineering/BOMs";

export const bomService = {
  search: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<BOMListDto>>(`${BOMS}/search`, query, { signal })).data,

  getById: async (id: number) => (await apiClient.get<BOMDto>(`${BOMS}/${id}`)).data,

  getTree: async (id: number) => (await apiClient.get<BOMTreeNodeDto>(`${BOMS}/${id}/tree`)).data,

  getNextVersion: async (productId: number) =>
    (await apiClient.get<number>(`${BOMS}/products/${productId}/next-version`)).data,

  whereUsed: async (query: Partial<GetWhereUsedQuery> & Pick<GetWhereUsedQuery, "productId">) =>
    (await apiClient.post<Paged<WhereUsedDto>>(`${BOMS}/where-used`, query)).data,

  /** شناسه فرمول جدید */
  create: async (command: CreateBOMCommand) => (await apiClient.post<number>(BOMS, command)).data,

  update: async (id: number, command: UpdateBOMCommand) => {
    await apiClient.put(`${BOMS}/${id}`, command);
  },

  /** شناسه نسخه جدید */
  copy: async (command: CopyBOMCommand) =>
    (await apiClient.post<number>(`${BOMS}/copy`, command)).data,

  remove: async (id: number) => {
    await apiClient.delete(`${BOMS}/${id}`);
  },
};
