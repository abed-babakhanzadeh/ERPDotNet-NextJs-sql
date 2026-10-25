import { z } from "zod";
import { firstFormError } from "@/lib/form-errors";
import type { SubstituteRow } from "./SubstitutesDialog";

export interface UnitOption {
  value: number;
  label: string;
  factor: number;
}

export interface BOMRow {
  id: string;
  childProductId: number | null;
  childProductCode?: string;
  childProductName?: string;

  unitName: string;
  baseUnitId: number;
  quantity: number;

  inputQuantity: number;
  inputUnitId: number;

  unitOptions: UnitOption[];

  wastePercentage: number;
  substitutes: SubstituteRow[];
}

export interface BOMHeaderState {
  productId: number | null;
  productName?: string;
  title: string;
  version: number;
  usage: number; // 1=Main, 2=Alternate
  type: number;
  fromDate: string;
  toDate?: string;
  isActive: boolean;
}

export interface BOMFormValues extends BOMHeaderState {
  details: BOMRow[];
}

export const emptyBOM = (): BOMFormValues => ({
  productId: null,
  title: "",
  version: 1,
  usage: 1,
  type: 1,
  fromDate: new Date().toISOString().split("T")[0],
  toDate: undefined,
  isActive: true,
  details: [],
});

/** سربرگ فرم بدون سطرها */
export const headerOf = (values: BOMFormValues): BOMHeaderState => {
  const header: Partial<BOMFormValues> = { ...values };
  delete header.details;
  return header as BOMHeaderState;
};

const toTime = (value: unknown) => {
  if (!value) return NaN;
  return new Date(value as string).getTime();
};

/** قواعد فرم BOM، هم‌راستا با CreateBOMCommandValidator و BOMDetailInputValidator */
export const bomSchema = z
  .object({
    productId: z.number().nullable(),
    productName: z.string().optional(),
    title: z.string(),
    version: z.union([z.number(), z.string()]),
    usage: z.union([z.number(), z.string()]),
    type: z.union([z.number(), z.string()]),
    fromDate: z.union([z.string(), z.date()]),
    toDate: z.union([z.string(), z.date()]).optional().nullable(),
    isActive: z.boolean(),
    details: z.array(z.custom<BOMRow>()),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    if (!v.productId) issue(["productId"], "کالا/قلم نهایی انتخاب نشده");
    if (!v.title.trim()) issue(["title"], "عنوان فرمول الزامی است.");
    if (!(Number(v.version) > 0)) issue(["version"], "شماره نسخه باید بزرگتر از صفر باشد.");
    const from = toTime(v.fromDate);
    const to = toTime(v.toDate);
    if (!isNaN(from) && !isNaN(to) && to <= from)
      issue(["toDate"], "تاریخ پایان باید بعد از تاریخ شروع باشد.");

    if (v.details.length === 0) {
      issue(["details"], "اقلام فرمول وارد نشده");
      return;
    }

    // شماره ردیف همان شماره نمایش‌داده‌شده در جدول است
    v.details.forEach((row, index) => {
      const n = index + 1;
      if (!row.childProductId) {
        issue(["details", index, "childProductId"], `ردیف ${n}: کالا/قلم انتخاب نشده است.`);
      } else if (!row.inputUnitId) {
        // واحد ردیف بعد از انتخاب کالا از سرور می‌آید؛ تا نرسیده ثبت نمی‌کنیم تا واحد صفر نرود
        issue(
          ["details", index, "inputUnitId"],
          `واحد ردیف ${n} هنوز بارگذاری نشده است؛ چند لحظه دیگر دوباره ثبت کنید.`,
        );
      } else if (!(Number(row.quantity) > 0)) {
        issue(["details", index, "inputQuantity"], `ردیف ${n}: مقدار مصرف باید بیشتر از صفر باشد.`);
      } else {
        const waste = Number(row.wastePercentage || 0);
        if (!(waste >= 0 && waste <= 100))
          issue(["details", index, "wastePercentage"], `ردیف ${n}: درصد ضایعات باید بین ۰ تا ۱۰۰ باشد.`);
      }
    });
  });

/** اولین پیام خطا به ترتیب فیلدهای فرم؛ برای نمایش در toast */
export const firstBOMError = (errors: Record<string, unknown>) =>
  firstFormError(errors, ["productId", "title", "version", "fromDate", "toDate", "details"]);
