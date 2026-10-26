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
export type CompanyDto = S["CompanyDto"];
export type CreateCompanyCommand = S["CreateCompanyCommand"];
export type UpdateCompanyCommand = S["UpdateCompanyCommand"];
export type FiscalYearDto = S["FiscalYearDto"];
export type CreateFiscalYearCommand = S["CreateFiscalYearCommand"];
export type UpdateFiscalYearCommand = S["UpdateFiscalYearCommand"];
export type CostCenterDto = S["CostCenterDto"];
export type CreateCostCenterCommand = S["CreateCostCenterCommand"];
export type UpdateCostCenterCommand = S["UpdateCostCenterCommand"];
export type ProductCategoryDto = S["ProductCategoryDto"];
export type CreateProductCategoryCommand = S["CreateProductCategoryCommand"];
export type UpdateProductCategoryCommand = S["UpdateProductCategoryCommand"];
export type ProductAttributeDto = S["ProductAttributeDto"];
export type ProductAttributeValueDto = S["ProductAttributeValueDto"];
export type ProductAttributeValueInput = S["ProductAttributeValueInput"];
export type CreateProductAttributeCommand = S["CreateProductAttributeCommand"];
export type UpdateProductAttributeCommand = S["UpdateProductAttributeCommand"];
export type ProductVariantDto = S["ProductVariantDto"];

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
export type TaskDetailsDto = S["TaskDetailsDto"];
export type TaskHistoryDto = S["TaskHistoryDto"];
export type UpdateStateSlaCommand = S["UpdateStateSlaCommand"];
export type DelegationDto = S["DelegationDto"];
export type DelegateUserDto = S["DelegateUserDto"];
export type CreateDelegationCommand = S["CreateDelegationCommand"];

// --- انبار (دستورهایی که تایپ دستی ندارند) ---
export type UpdateWarehouseCommand = S["UpdateWarehouseCommand"];
export type DefineInventoryDocTypeCommand = S["DefineInventoryDocTypeCommand"];
export type UpdateInventoryDocTypeCommand = S["UpdateInventoryDocTypeCommand"];
export type WarehouseUserDto = S["WarehouseUserDto"];

/** پروفایل کاربر جاری (GET /Auth/profile) */
export type UserProfileDto = UserDto;

// --- شماره سریال انبار ---
export type InventorySerialDto = S["InventorySerialDto"];
export type FefoAllocationDto = S["FefoAllocationDto"];
export type FefoLineDto = S["FefoLineDto"];
export type StockCountListItemDto = S["StockCountListItemDto"];
export type StockCountDto = S["StockCountDto"];
export type StockCountLineDto = S["StockCountLineDto"];
export type CreateStockCountCommand = S["CreateStockCountCommand"];
export type UpdateStockCountCommand = S["UpdateStockCountCommand"];
export type StockCountLineInput = S["StockCountLineInput"];
export type FinalizeStockCountCommand = S["FinalizeStockCountCommand"];
export type FinalizeStockCountResult = S["FinalizeStockCountResult"];

// تولید
export type ProductionOrderListDto = S["ProductionOrderListDto"];
export type ProductionOrderDto = S["ProductionOrderDto"];
export type ProductionOrderMaterialDto = S["ProductionOrderMaterialDto"];
export type ProductionBomOptionDto = S["ProductionBomOptionDto"];
export type ProductionRequirementsDto = S["ProductionRequirementsDto"];
export type CreateProductionOrderCommand = S["CreateProductionOrderCommand"];
export type UpdateProductionOrderCommand = S["UpdateProductionOrderCommand"];
export type ProductionOrderProgressDto = S["ProductionOrderProgressDto"];
export type ProductionMaterialProgressDto = S["ProductionMaterialProgressDto"];
export type ProductionLinkedDocDto = S["ProductionLinkedDocDto"];
export type IssueProductionMaterialsCommand = S["IssueProductionMaterialsCommand"];
export type ReceiveProductionOutputCommand = S["ReceiveProductionOutputCommand"];
export type ProductionVarianceSummaryDto = S["ProductionVarianceSummaryDto"];
export type GetMaterialPlanQuery = S["GetMaterialPlanQuery"];
export type MaterialPlanDto = S["MaterialPlanDto"];
export type MaterialPlanLineDto = S["MaterialPlanLineDto"];
export type MaterialPlanOrderDto = S["MaterialPlanOrderDto"];
export type WorkCenterDto = S["WorkCenterDto"];
export type WorkCenterOptionDto = S["WorkCenterOptionDto"];
export type CreateWorkCenterCommand = S["CreateWorkCenterCommand"];
export type UpdateWorkCenterCommand = S["UpdateWorkCenterCommand"];
export type BOMOperationDto = S["BOMOperationDto"];
export type ProductionOperationDto = S["ProductionOperationDto"];
export type OperationReportDto = S["OperationReportDto"];
export type ReportOperationCommand = S["ReportOperationCommand"];
export type WorkCenterLoadDto = S["WorkCenterLoadDto"];
