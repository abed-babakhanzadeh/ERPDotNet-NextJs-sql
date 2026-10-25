import type { UnitDto } from "./api";
import type { Product as ProductType } from "./product";

// منبع حقیقت: قرارداد OpenAPI بک‌اند
export type Unit = UnitDto;

export type Product = ProductType;

export type SortConfig = {
  key: string; // Allow any property name for flexibility across different entity types
  direction: "ascending" | "descending";
} | null;

export type FilterCondition = {
  id: string;
  operator: string;
  // TODO(phase 2): با DataGrid عمومی نوع دقیق مقدار هر ستون جایگزین می‌شود
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  title?: string;
  /** ستون در جدول و نمای کارتی نمایش داده نمی‌شود */
  hidden?: boolean;
  /**
   * نقش ستون در نمای کارتی موبایل: `title` عنوان کارت، `hidden` حذف از کارت.
   * پیش‌فرض: اولین ستون غیرسفارشی عنوان است و بقیه به‌صورت «برچسب: مقدار» می‌آیند.
   */
  mobile?: "title" | "hidden";
  type: "string" | "number" | "boolean" | "date" | "text" | "custom"; // اضافه شدن date
  // TODO(phase 2): DataGrid عمومی (ColumnConfig<TRow>) این any را حذف می‌کند
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
};
