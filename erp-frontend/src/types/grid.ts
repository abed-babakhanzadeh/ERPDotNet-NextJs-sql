import { ReactNode } from "react";

export type FilterOperation =
  | "contains"
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "startswith"
  | "endswith";

export interface GridColumn<T> {
  header: string;
  accessorKey: keyof T | string; // کلید دسترسی به دیتا
  sortable?: boolean;
  filterable?: boolean; // آیا فیلتر داشته باشد؟
  filterType?: "text" | "number" | "boolean"; // نوع فیلتر برای نمایش گزینه‌های مناسب
  width?: number; // عرض اولیه
  minWidth?: number;

  render?: (row: T) => ReactNode;
}

export interface PaginationState {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// مدل فیلتر که در State نگه می‌داریم
export interface ColumnFilterState {
  value: string;
  operation: FilterOperation;
}
