// src/modules/base-info/products/services/productService.ts

import apiClient from "@/services/apiClient";
import { PaginatedResult, PaginatedRequest } from "@/types";
import { Product, CreateProductRequest, UpdateProductRequest } from "../types";

const BASE_URL = "/BaseInfo/Products";

export const productService = {
  search: async (params: PaginatedRequest) => {
    const { data } = await apiClient.post<PaginatedResult<Product>>(
      `${BASE_URL}/search`,
      params
    );
    return data;
  },

  getById: async (id: number | string) => {
    const { data } = await apiClient.get<Product>(`${BASE_URL}/${id}`);
    return data;
  },

  create: async (payload: CreateProductRequest) => {
    const { data } = await apiClient.post(BASE_URL, payload);
    return data;
  },

  update: async (payload: UpdateProductRequest) => {
    const { data } = await apiClient.put(`${BASE_URL}/${payload.id}`, payload);
    return data;
  },

  delete: async (id: number | string) => {
    const { data } = await apiClient.delete(`${BASE_URL}/${id}`);
    return data;
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    // طبق UploadController خروجی { path: "..." } است
    const { data } = await apiClient.post<{ path: string }>(
      "/Upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data.path;
  },
};
