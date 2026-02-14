// src/types/inventory.ts

export enum InventoryDocStatus {
  Draft = 1,
  Submitted = 2,
  Approved = 3,
  Rejected = 4,
  Posted = 5,
  Cancelled = 6,
}

// مپینگ برای نمایش رنگ و متن وضعیت‌ها
export const InventoryDocStatusMap: Record<
  number,
  {
    label: string;
    color: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  1: {
    label: "پیش‌نویس",
    color: "text-amber-600 border-amber-200 bg-amber-50",
    variant: "outline",
  },
  2: {
    label: "ارسال شده",
    color: "text-blue-600 border-blue-200 bg-blue-50",
    variant: "outline",
  },
  3: {
    label: "تایید شده",
    color: "text-emerald-600 border-emerald-200 bg-emerald-50",
    variant: "outline",
  },
  4: {
    label: "رد شده",
    color: "text-red-600 border-red-200 bg-red-50",
    variant: "outline",
  },
  5: {
    label: "قطعی شده",
    color: "bg-slate-800 text-white hover:bg-slate-900",
    variant: "default",
  },
  6: {
    label: "ابطال",
    color: "text-red-500 bg-red-50",
    variant: "destructive",
  },
};

export interface InventoryDocDto {
  id: number;
  docNumber: number;
  docDate: string;
  description: string;

  status: InventoryDocStatus;

  docTypeId: number;
  docTypeTitle: string;

  warehouseId: number;
  warehouseTitle: string;

  rowVersion: string; // برای حذف و ویرایش ضروری است
}

// 1. تعریف انواع انبار (طبق Backend)
export enum WarehouseType {
  Physical = 1, // فیزیکی
  Scrap = 2, // ضایعات
  Quarantine = 3, // قرنطینه
  ShopFloor = 4, // پای خط
  ConsignmentOut = 5, // امانی ما نزد دیگران
}

// 2. کامند ایجاد انبار (طبق DefineWarehouseCommand)
export interface DefineWarehouseCommand {
  title: string;
  code: string;
  type: WarehouseType;
  address?: string;
  isActive: boolean;
}

export interface WarehouseDto {
  id: number;
  title: string;
  code: string;
  address?: string;
  type: string; // این رشته عنوان فارسی Enum است که بک‌ند می‌فرستد
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  rowVersion: string;
}

// === Location Types ===

export interface LocationDto {
  id: number;
  title: string;
  code: string;
  parentId?: number | null; // می‌تواند نال باشد (ریشه)
  path: string;
  isBlocked: boolean;
  level: number;
  rowVersion: string;

  // این فیلد در دیتابیس نیست اما برای نمایش درختی در فرانت ممکن است پر شود
  children?: LocationDto[];
}

export interface CreateLocationCommand {
  warehouseId: number;
  title: string;
  code: string;
  parentId?: number | null;
  isBlocked: boolean;
}

export interface UpdateLocationCommand {
  id: number;
  title: string;
  code: string;
  parentId?: number | null;
  isBlocked: boolean;
  rowVersion: string;
}

// === Doc Types ===

export enum InventoryNature {
  Input = 1,
  Output = 2,
  Transfer = 3,
}

// ✅ مپینگ استاندارد فارسی برای ماهیت سند
export const InventoryNatureLabels: Record<number, string> = {
  [InventoryNature.Input]: "وارده (رسید)",
  [InventoryNature.Output]: "صادره (حواله)",
  [InventoryNature.Transfer]: "انتقال / جابجایی",
};

export enum NumberingScope {
  Global = 1,
  PerFiscalYear = 2,
  PerDocType = 3,
  PerDocTypeAndYear = 4,
}

// ✅ اضافه کردن مپینگ استاندارد برای نمایش
export const NumberingScopeLabels: Record<number, string> = {
  [NumberingScope.Global]: "سراسری (کلی)",
  [NumberingScope.PerFiscalYear]: "به تفکیک سال مالی",
  [NumberingScope.PerDocType]: "به تفکیک نوع سند",
  [NumberingScope.PerDocTypeAndYear]: "نوع سند + سال مالی",
};

export interface InventoryDocTypeDto {
  id: number;
  title: string;
  nature: string; // نمایشی (فارسی)
  natureValue: number; // عددی (برای فرم)

  parentId?: number | null;
  parentTitle?: string;

  requiredPermissionName?: string;
  affectsCost: boolean;
  numberingScope: NumberingScope;
  isReferenceRequired: boolean;

  // لیست نام موجودیت‌های مجاز (مثلاً: Project, CostCenter)
  allowedReferenceEntityNames: string[];

  rowVersion: string;
}

export interface DefineDocTypeCommand {
  title: string;
  nature: InventoryNature;
  parentId?: number | null;
  requiredPermissionName?: string;
  affectsCost: boolean;
  numberingScope: NumberingScope;
  isReferenceRequired: boolean;
  allowedReferenceEntityNames: string[];
}

export interface UpdateDocTypeCommand extends DefineDocTypeCommand {
  id: number;
  rowVersion: string;
}

// برای پر کردن کمبوها
export interface EnumLookupDto {
  value: number;
  name: string; // نام سیستمی
  title?: string; // اگر سمت سرور تایتل فارسی بفرستید، وگرنه از مپینگ استفاده می‌کنیم
}
