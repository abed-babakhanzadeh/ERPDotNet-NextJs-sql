export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface FilterModel {
  propertyName: string;
  operation:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "contains"
    | "startswith"
    | "endswith";
  value: string;
  value2?: string;
  logic?: "and" | "or";
}

export interface PaginatedRequest {
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
  sortDescending?: boolean;
  searchTerm?: string;
  filters?: FilterModel[];
}

export interface ColumnConfig<T = any> {
  accessorKey: keyof T | string; // کلید دسترسی به دیتا
  header: string; // عنوان ستون (برای نمایش در هدر)
  key?: string; // کلید یکتا برای React
  sortable?: boolean;
  filterable?: boolean;
  // تابع رندر: ورودی اول مقدار فیلد، ورودی دوم کل سطر
  render?: (value: any, row: T) => React.ReactNode;
}
