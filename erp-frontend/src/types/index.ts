import type { Product as ProductType } from "./product";

export type Unit = {
  id: number;
  title: string;
  symbol: string;
  precision: number;
  isActive: boolean;
  baseUnitId?: number;
  conversionFactor: number;
  baseUnitName?: string;
};

export type Product = ProductType;

export type SortConfig = {
  key: string; // Allow any property name for flexibility across different entity types
  direction: "ascending" | "descending";
} | null;

export type FilterCondition = {
  id: string;
  operator: string;
  value: any;
  value2?: any; // For between operator
};

export type ColumnFilter = {
  key: string; // Allow any property name for flexibility
  logic: "and" | "or";
  conditions: FilterCondition[];
};

// types.ts
export type ColumnConfig = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date"; // اضافه شدن date
  render?: (value: any, row: any) => React.ReactNode;
};
