import { z } from "zod";
import { firstFormError } from "@/lib/form-errors";

/** سطر جدول اقلام؛ مقدار ورودی‌های جدول رشته است و هنگام ارسال به عدد تبدیل می‌شود */
export interface DocRow {
  id?: number | null;
  tempId?: number;
  productId: number | null;
  productCode?: string;
  productName?: string;
  unitTitle?: string;
  mainUnitQuantity: number | string;
  locationId?: number | string | null;
  destinationLocationId?: number | string | null;
  batchNumber?: string;
  description?: string;
}

export interface DocFormValues {
  docTypeId: number | null;
  warehouseId: number | null;
  destinationWarehouseId: number | null;
  docDate: Date | string;
  targetPartyName: string;
  referenceExternalCode: string;
  description: string;
  details: DocRow[];
}

export const EMPTY_DOC: DocFormValues = {
  docTypeId: null,
  warehouseId: null,
  destinationWarehouseId: null,
  docDate: new Date(),
  targetPartyName: "",
  referenceExternalCode: "",
  description: "",
  details: [],
};

/** سطری که کالا دارد؛ سطرهای خالی هنگام ثبت نادیده گرفته می‌شوند */
export const hasProduct = (row: DocRow) => !!row.productId && Number(row.productId) > 0;

/**
 * قواعد فرم سند انبار، هم‌راستا با CreateInventoryDocValidator و UpdateInventoryDocValidator.
 * ماهیت انتقال به نوع سند بستگی دارد، پس طرح با تابع isTransfer ساخته می‌شود.
 */
export function makeDocSchema(opts: { isTransfer: (docTypeId: number | null) => boolean; requireLocation: boolean }) {
  return z
    .object({
      docTypeId: z.number().nullable(),
      warehouseId: z.number().nullable(),
      destinationWarehouseId: z.number().nullable(),
      docDate: z.union([z.date(), z.string()]),
      targetPartyName: z.string(),
      referenceExternalCode: z.string(),
      description: z.string(),
      details: z.array(z.custom<DocRow>()),
    })
    .superRefine((v, ctx) => {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

      if (!v.docTypeId) issue(["docTypeId"], "نوع سند را انتخاب کنید.");
      if (!v.warehouseId) issue(["warehouseId"], "انبار را انتخاب کنید.");
      if (!v.docTypeId || !v.warehouseId) return;

      const transfer = opts.isTransfer(v.docTypeId);
      if (transfer && (!v.destinationWarehouseId || Number(v.destinationWarehouseId) === Number(v.warehouseId))) {
        issue(["destinationWarehouseId"], "برای سند انتقال، انبار مقصدی متفاوت از انبار مبدأ انتخاب کنید.");
        return;
      }

      if (!v.details.some(hasProduct)) {
        issue(["details"], "لطفا حداقل یک قلم کالا وارد کنید.");
        return;
      }

      // شماره ردیف همان شماره نمایش‌داده‌شده در جدول است
      v.details.forEach((row, index) => {
        if (!hasProduct(row)) return;
        const n = index + 1;
        if (!row.mainUnitQuantity || Number(row.mainUnitQuantity) <= 0) {
          issue(["details", index, "mainUnitQuantity"], `ردیف ${n}: تعداد کالا باید بزرگتر از صفر باشد.`);
        } else if (opts.requireLocation && !row.locationId) {
          issue(["details", index, "locationId"], `ردیف ${n}: قفسه را انتخاب کنید.`);
        } else if (transfer && !row.destinationLocationId) {
          issue(["details", index, "destinationLocationId"], `ردیف ${n}: قفسه مقصد را انتخاب کنید.`);
        }
      });
    });
}

/** اولین پیام خطا به ترتیب فیلدهای فرم؛ برای نمایش در toast */
export const firstDocError = (errors: Record<string, unknown>) =>
  firstFormError(errors, ["docTypeId", "warehouseId", "destinationWarehouseId", "details"]);
