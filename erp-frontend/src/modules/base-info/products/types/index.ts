// src/modules/base-info/products/types.ts

export enum ProductSupplyType {
  Buy = 1,
  Produce = 2,
  Service = 3,
}

export interface Product {
  id: number;
  code: string;
  name: string;
  latinName?: string;
  descriptions?: string;
  unitId: number;
  unitName?: string;
  supplyType: ProductSupplyType;
  imagePath?: string;
  isActive: boolean;
  rowVersion?: string; // برای Concurrency Check در آپدیت
  conversions?: ProductConversion[];
}

export interface ProductConversion {
  id: number;
  alternativeUnitId: number;
  alternativeUnitName?: string;
  factor: number;
}

// --- Inputs ---

export interface ProductConversionInput {
  alternativeUnitId: number;
  factor: number;
}

export interface CreateProductRequest {
  code: string;
  name: string;
  latinName?: string;
  descriptions?: string;
  unitId: number;
  supplyType: ProductSupplyType;
  imagePath?: string;
  conversions: ProductConversionInput[];
}

export interface ProductConversionUpdateDto {
  id?: number | null;
  alternativeUnitId: number;
  factor: number;
}

export interface UpdateProductRequest {
  id: number;
  code: string;
  name: string;
  latinName?: string;
  descriptions?: string;
  unitId: number;
  supplyType: ProductSupplyType;
  imagePath?: string;
  isActive: boolean;
  rowVersion?: string;
  conversions: ProductConversionUpdateDto[];
}
