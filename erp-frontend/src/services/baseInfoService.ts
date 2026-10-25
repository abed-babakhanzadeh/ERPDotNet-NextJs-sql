import apiClient from "@/lib/api/client";
import type {
  CreateProductCommand,
  CreateUnitCommand,
  PagedQuery,
  Paged,
  ProductDto,
  UnitDto,
  UpdateProductCommand,
  UpdateUnitCommand,
} from "@/types/api";

const UNITS = "/BaseInfo/Units";
const PRODUCTS = "/BaseInfo/Products";

export const unitService = {
  search: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<UnitDto>>(`${UNITS}/search`, query, { signal })).data,

  lookup: async () => (await apiClient.get<UnitDto[]>(`${UNITS}/lookup`)).data,

  getById: async (id: number) => (await apiClient.get<UnitDto>(`${UNITS}/${id}`)).data,

  /** شناسه واحد جدید */
  create: async (command: CreateUnitCommand) =>
    (await apiClient.post<{ id: number }>(UNITS, command)).data.id,

  update: async (id: number, command: UpdateUnitCommand) => {
    await apiClient.put(`${UNITS}/${id}`, command);
  },

  remove: async (id: number) => {
    await apiClient.delete(`${UNITS}/${id}`);
  },
};

export const productService = {
  search: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<ProductDto>>(`${PRODUCTS}/search`, query, { signal })).data,

  getById: async (id: number) => (await apiClient.get<ProductDto>(`${PRODUCTS}/${id}`)).data,

  /** شناسه کالای جدید */
  create: async (command: CreateProductCommand) =>
    (await apiClient.post<{ id: number }>(PRODUCTS, command)).data.id,

  update: async (id: number, command: UpdateProductCommand) => {
    await apiClient.put(`${PRODUCTS}/${id}`, command);
  },

  remove: async (id: number) => {
    await apiClient.delete(`${PRODUCTS}/${id}`);
  },
};

export const fileService = {
  /** آپلود فایل عمومی؛ مسیر نسبی فایل ذخیره‌شده را برمی‌گرداند */
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<{ path: string }>("/Upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.path;
  },
};
