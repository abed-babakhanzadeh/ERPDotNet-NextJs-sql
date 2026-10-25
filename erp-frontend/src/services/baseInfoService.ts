import apiClient from "@/lib/api/client";
import type {
  CompanyDto,
  CostCenterDto,
  CreateCompanyCommand,
  CreateCostCenterCommand,
  CreateFiscalYearCommand,
  CreateProductCategoryCommand,
  CreateProductCommand,
  CreateUnitCommand,
  PagedQuery,
  Paged,
  ProductCategoryDto,
  ProductDto,
  FiscalYearDto,
  UnitDto,
  UpdateCompanyCommand,
  UpdateCostCenterCommand,
  UpdateFiscalYearCommand,
  UpdateProductCategoryCommand,
  UpdateProductCommand,
  UpdateUnitCommand,
} from "@/types/api";

/** گزینه enum از بک‌اند (EnumExtensions.ToList) */
export interface EnumOption {
  value: number;
  label: string;
}

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

/** عملیات مشترک اطلاعات پایه‌ای که search/lookup/CRUD یکسان دارند */
function baseInfoCrud<TDto, TCreate, TUpdate>(base: string) {
  return {
    search: async (query: PagedQuery, signal?: AbortSignal) =>
      (await apiClient.post<Paged<TDto>>(`${base}/search`, query, { signal })).data,

    lookup: async () => (await apiClient.get<TDto[]>(`${base}/lookup`)).data,

    getById: async (id: number) => (await apiClient.get<TDto>(`${base}/${id}`)).data,

    /** شناسه رکورد جدید */
    create: async (command: TCreate) =>
      (await apiClient.post<{ id: number }>(base, command)).data.id,

    update: async (id: number, command: TUpdate) => {
      await apiClient.put(`${base}/${id}`, command);
    },

    remove: async (id: number) => {
      await apiClient.delete(`${base}/${id}`);
    },
  };
}

export const companyService = baseInfoCrud<CompanyDto, CreateCompanyCommand, UpdateCompanyCommand>(
  "/BaseInfo/Companies",
);

export const fiscalYearService = {
  ...baseInfoCrud<FiscalYearDto, CreateFiscalYearCommand, UpdateFiscalYearCommand>(
    "/BaseInfo/FiscalYears",
  ),
  statuses: async () =>
    (await apiClient.get<EnumOption[]>("/BaseInfo/FiscalYears/statuses")).data,
};

export const costCenterService = {
  ...baseInfoCrud<CostCenterDto, CreateCostCenterCommand, UpdateCostCenterCommand>(
    "/BaseInfo/CostCenters",
  ),
  types: async () => (await apiClient.get<EnumOption[]>("/BaseInfo/CostCenters/types")).data,
};

export const productCategoryService = baseInfoCrud<
  ProductCategoryDto,
  CreateProductCategoryCommand,
  UpdateProductCategoryCommand
>("/BaseInfo/ProductCategories");

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
