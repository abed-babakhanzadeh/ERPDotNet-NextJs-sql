/**
 * نام‌های کوتاه برای تایپ‌های تولیدشده از قرارداد OpenAPI بک‌اند.
 * منبع حقیقت `api.generated.ts` است (npm run api:types)؛ اینجا فقط نام‌گذاری می‌شود.
 */
import type { components } from "./api.generated";

type S = components["schemas"];

// --- عمومی ---
export type FilterModel = S["FilterModel"];
/** بدنه مشترک همه درخواست‌های فهرست صفحه‌بندی‌شده (سرور برای فیلدهای ارسال‌نشده پیش‌فرض دارد) */
export type PagedQuery = Partial<S["GetAllProductsQuery"]>;
export interface Paged<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

// --- اطلاعات پایه ---
export type UnitDto = S["UnitDto"];
export type CreateUnitCommand = S["CreateUnitCommand"];
export type UpdateUnitCommand = S["UpdateUnitCommand"];
export type ProductDto = S["ProductDto"];
export type ProductConversionDto = S["ProductConversionDto"];
export type CreateProductCommand = S["CreateProductCommand"];
export type UpdateProductCommand = S["UpdateProductCommand"];

// --- مهندسی محصول ---
export type BOMListDto = S["BOMListDto"];
export type BOMDto = S["BOMDto"];
export type BOMDetailDto = S["BOMDetailDto"];
export type BOMSubstituteDto = S["BOMSubstituteDto"];
export type BOMTreeNodeDto = S["BOMTreeNodeDto"];
export type CreateBOMCommand = S["CreateBOMCommand"];
export type UpdateBOMCommand = S["UpdateBOMCommand"];
export type CopyBOMCommand = S["CopyBOMCommand"];
export type WhereUsedDto = S["WhereUsedDto"];
export type GetWhereUsedQuery = S["GetWhereUsedQuery"];

// --- کاربران و دسترسی ---
export type LoginCommand = S["LoginCommand"];
export type UserDto = S["UserDto"];
export type CreateUserCommand = S["CreateUserCommand"];
export type UpdateUserCommand = S["UpdateUserCommand"];
export type RoleDto = S["RoleDto"];
export type ChangePasswordDto = S["ChangePasswordDto"];
export type ChangeOwnPasswordDto = S["ChangeOwnPasswordDto"];
export type UpdateRolePermissionsCommand = S["UpdateRolePermissionsCommand"];
export type UpdateUserPermissionsCommand = S["UpdateUserPermissionsCommand"];
export type CopyUserPermissionsCommand = S["CopyUserPermissionsCommand"];
export type UserPermissionDetailDto = S["UserPermissionDetailDto"];

/** گره درخت مجوزها (این endpoint هنوز نوع پاسخ اعلام نمی‌کند؛ هم‌شکل PermissionDto بک‌اند) */
export interface PermissionNode {
  id: number;
  title: string;
  name: string;
  isMenu: boolean;
  children: PermissionNode[];
}

// --- گردش کار ---
export type InboxTaskDto = S["InboxTaskDto"];
export type CreateProcessCommand = S["CreateProcessCommand"];
export type CreateStateCommand = S["CreateStateCommand"];
export type CreateTransitionCommand = S["CreateTransitionCommand"];

// --- انبار (دستورهایی که تایپ دستی ندارند) ---
export type UpdateWarehouseCommand = S["UpdateWarehouseCommand"];
export type DefineInventoryDocTypeCommand = S["DefineInventoryDocTypeCommand"];
export type UpdateInventoryDocTypeCommand = S["UpdateInventoryDocTypeCommand"];

/** پروفایل کاربر جاری (GET /Auth/profile) */
export type UserProfileDto = UserDto;
