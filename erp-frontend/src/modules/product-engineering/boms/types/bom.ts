export type BOM = {
  id: number;
  productName: string;
  productCode: string;
  version: string;
  title: string;
  type: string;   // مقدار نمایشی Enum (مثلاً: تولیدی، مهندسی)
  status: string; // مقدار نمایشی Enum (مثلاً: فعال، پیش‌نویس)
  isActive: boolean;
};