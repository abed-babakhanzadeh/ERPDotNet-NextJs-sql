// src/types/bom.ts

export type BOM = {
  id: number;
  productName: string;
  productCode: string;

  version: number; // تغییر به number

  title: string;
  type: string; // Manufacturing, Engineering, ...
  status: string; // Active, Draft, ...

  usageId: number; // اضافه شد (1=Main, 2=Alternate)
  usageTitle: string; // اضافه شد (اصلی/فرعی)

  isActive: boolean;
};
