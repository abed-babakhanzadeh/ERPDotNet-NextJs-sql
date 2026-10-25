import type { FilterModel } from "./api";
// src/types/inventory.ts

export enum InventoryDocStatus {
  Draft = 1,
  InProcess = 2,
  RequiresRevision = 3,
  Approved = 4,
  Rejected = 5,
  Posted = 6,
  Cancelled = 7,
}

/** برچسب و رنگ معنایی هر وضعیت سند؛ نمایش از طریق `InventoryDocStatusBadge` */
export const InventoryDocStatusMap: Record<
  InventoryDocStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  [InventoryDocStatus.Draft]: { label: "پیش‌نویس", tone: "neutral" },
  [InventoryDocStatus.InProcess]: { label: "در انتظار تایید", tone: "info" },
  [InventoryDocStatus.RequiresRevision]: { label: "نیازمند اصلاح", tone: "warning" },
  [InventoryDocStatus.Approved]: { label: "تایید شده", tone: "success" },
  [InventoryDocStatus.Rejected]: { label: "رد شده", tone: "danger" },
  [InventoryDocStatus.Posted]: { label: "قطعی شده", tone: "success" },
  [InventoryDocStatus.Cancelled]: { label: "ابطال شده", tone: "danger" },
};

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

// === Product Inventory Profile (پروفایل انبار کالا) ===

export interface ItemWarehouseSettingDto {
  id: number;
  warehouseId: number;
  warehouseTitle: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  defaultLocationId?: number | null;
  defaultLocationTitle?: string;
  defaultLocationCode?: string;
  rowVersion: string;
}

export interface InventoryItemProfileDto {
  id: number;
  productId: number;

  isBatchManaged: boolean;
  isSerialManaged: boolean;
  shelfLifeDays?: number | null;

  mainInventoryUnitId: number;
  mainInventoryUnitTitle: string;

  warehouseSettings: ItemWarehouseSettingDto[];
}

export interface ConfigureItemProfileCommand {
  productId: number;
  isBatchManaged: boolean;
  isSerialManaged: boolean;
  shelfLifeDays?: number | null;
  mainInventoryUnitId: number;
}

export interface SetItemWarehouseSettingCommand {
  warehouseId: number;
  productId: number;
  reorderPoint: number;
  maxStock: number;
  minStock: number;
  defaultLocationId?: number | null;
}

// === Batch Management (مدیریت بچ) ===

export interface InventoryBatchDto {
  id: number;
  productId: number;
  batchNumber: string;
  manufactureDate?: string | null; // ISO Date String
  expiryDate?: string | null; // ISO Date String
  supplierBatchCode?: string | null;
  description?: string | null;

  isBlocked: boolean;
  blockReason?: string | null;
  isExpired: boolean; // فیلد محاسباتی

  rowVersion: string;
}

export interface CreateBatchCommand {
  productId: number;
  batchNumber: string;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  supplierBatchCode?: string | null;
  description?: string | null;
}

export interface UpdateBatchCommand {
  id: number;
  batchNumber?: string;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  supplierBatchCode?: string | null;
  description?: string | null;
  isBlocked: boolean;
  blockReason?: string | null;
  rowVersion: string;
}

// === Document DTOs (Read) ===

export interface InventoryDocDetailDto {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unitTitle: string;

  mainUnitQuantity: number;
  subUnitQuantity: number;

  locationId?: number | null;
  /** فقط سند انتقال: قفسه مقصد */
  destinationLocationId?: number | null;
  destinationLocationCode?: string | null;
  locationCode?: string;

  batchId?: number | null;
  batchNumber?: string;

  description?: string;
}

export interface InventoryDocDto {
  id: number;
  docNumber: number;
  docDate: string; // ISO String
  docTypeId: number;
  docTypeTitle: string;
  nature: InventoryNature;

  warehouseId: number;
  warehouseTitle: string;
  destinationWarehouseId?: number | null;
  destinationWarehouseTitle?: string;

  status: InventoryDocStatus;
  description?: string;

  // Party Info
  referenceExternalCode?: string;
  targetPartyName?: string;
  targetPartyId?: string;
  targetPartyType?: string; // "Customer", "Vendor", etc.

  rowVersion: string;

  details: InventoryDocDetailDto[];
}

// === Commands (Write) ===

export interface CreateInventoryDocDetailDto {
  productId: number;
  mainUnitQuantity: number;
  subUnitQuantity: number;
  locationId?: number | null;
  /** فقط سند انتقال: قفسه مقصد */
  destinationLocationId?: number | null;
  batchId?: number | null;
  description?: string | null;
}

export interface CreateInventoryDocCommand {
  docTypeId: number;
  warehouseId: number;
  destinationWarehouseId?: number | null;
  docDate: Date; // در ارسال تبدیل به ISO می‌شود
  fiscalYearId?: number | null;

  referenceEntityName?: string;
  referenceEntityId?: number | null;
  referenceExternalCode?: string;

  targetPartyType?: string;
  targetPartyId?: string;
  targetPartyName?: string;

  description?: string;

  details: CreateInventoryDocDetailDto[];
}

export interface UpdateInventoryDocDetailDto {
  id?: number | null; // null برای ردیف‌های جدید
  productId: number;
  mainUnitQuantity: number;
  subUnitQuantity: number;
  locationId?: number | null;
  /** فقط سند انتقال: قفسه مقصد */
  destinationLocationId?: number | null;
  batchId?: number | null;
  description?: string | null;
}

export interface UpdateInventoryDocCommand {
  id: number;
  docDate: Date;
  description?: string;
  warehouseId: number; // معمولاً انبار در ویرایش عوض نمی‌شود اما در DTO هست
  destinationWarehouseId?: number | null; // فقط برای سند انتقال
  rowVersion: string;

  details: UpdateInventoryDocDetailDto[];
}

// ==========================================
// Current Stock (موجودی لحظه‌ای)
// ==========================================

/** ردیفی که موجودی لحظه‌ای آن با جمع تراکنش‌ها نمی‌خواند */
export interface StockRebuildRowDto {
  stockId: number | null;
  warehouseId: number;
  warehouseTitle: string;
  productId: number;
  productCode: string;
  productName: string;
  locationId: number | null;
  batchId: number | null;
  currentQuantity: number;
  expectedQuantity: number;
  difference: number;
}

export interface StockRebuildResultDto {
  updated: number;
  created: number;
  zeroed: number;
}

export interface InventoryStockDto {
  id: number;
  warehouseTitle: string;
  productId: number;
  productName: string;
  productCode: string;
  unitTitle: string;
  quantityOnHand: number; // موجودی فیزیکی
  quantityReserved: number; // رزرو شده
  quantityBlocked: number; // مسدود/قرنطینه
  availableQuantity: number; // در دسترس (قابل فروش/مصرف)
  locationCode: string;
  locationPath: string;
  batchNumber: string;
}

// تایپ مربوط به پیلود ارسالی برای سرچ موجودی
export interface GetCurrentStockQuery {
  warehouseId: number; // اجباری
  productId?: number | null;
  pageNumber?: number;
  pageSize?: number;
  orderBy?: string;
  isDescending?: boolean;
  searchTerm?: string;
  excludeZeroBalances?: boolean;
  filters?: FilterModel[];
}

export interface ProductCardexDto {
  transactionId: number;
  transactionDate: Date | string;
  docNumber: number | string;
  docTypeTitle: string;
  description: string;
  warehouseTitle: string;
  batchNumber?: string;
  locationCode?: string;
  signTitle: string;
  inQuantity: number;
  outQuantity: number;
  runningBalance: number;
}
