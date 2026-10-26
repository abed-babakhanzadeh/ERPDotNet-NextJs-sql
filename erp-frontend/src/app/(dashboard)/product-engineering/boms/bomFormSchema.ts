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

/** خروجی جانبی فرمول؛ مقدار و سهم بها از ورودی‌های جدول به صورت رشته هم می‌آیند */
export interface BOMOutputRow {
  id: string;
  productId: number | null;
  productCode?: string;
  productName?: string;
  unitName?: string;
  type: number | string; // 1=همزاد، 2=فرعی
  quantity: number | string;
  costSharePercent: number | string;
}

export const OUTPUT_TYPE = { coProduct: 1, byProduct: 2 } as const;

/** عملیات مسیر تولید؛ زمان اجرا به ازای مقدار پایه فرمول است */
export interface BOMOperationRow {
  id: string;
  sequence: number | string;
  title: string;
  workCenterId: number | null;
  setupMinutes: number | string;
  runMinutes: number | string;
  description?: string;
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
  baseQuantity: number | string;
}

export interface BOMFormValues extends BOMHeaderState {
  details: BOMRow[];
  outputs: BOMOutputRow[];
  operations: BOMOperationRow[];
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
  baseQuantity: 1,
  details: [],
  outputs: [],
  operations: [],
});

/** سربرگ فرم بدون سطرها */
export const headerOf = (values: BOMFormValues): BOMHeaderState => {
  const header: Partial<BOMFormValues> = { ...values };
  delete header.details;
  delete header.outputs;
  delete header.operations;
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
    baseQuantity: z.union([z.number(), z.string()]),
    details: z.array(z.custom<BOMRow>()),
    outputs: z.array(z.custom<BOMOutputRow>()),
    operations: z.array(z.custom<BOMOperationRow>()),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    if (!v.productId) issue(["productId"], "کالا/قلم نهایی انتخاب نشده");
    if (!v.title.trim()) issue(["title"], "عنوان فرمول الزامی است.");
    if (!(Number(v.version) > 0)) issue(["version"], "شماره نسخه باید بزرگتر از صفر باشد.");
    if (!(Number(v.baseQuantity) > 0)) issue(["baseQuantity"], "مقدار پایه فرمول باید بیشتر از صفر باشد.");
    const from = toTime(v.fromDate);
    const to = toTime(v.toDate);
    if (!isNaN(from) && !isNaN(to) && to <= from)
      issue(["toDate"], "تاریخ پایان باید بعد از تاریخ شروع باشد.");

    validateOutputs(v.outputs, v.productId, issue);
    validateOperations(v.operations, issue);

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

/** قواعد خروجی‌های جانبی، هم‌راستا با BOMOutputInputValidator و BOMOutputRules در بک‌اند */
function validateOutputs(
  outputs: BOMOutputRow[],
  mainProductId: number | null,
  issue: (path: (string | number)[], message: string) => void,
) {
  const seen = new Set<number>();
  let coProductShare = 0;
  outputs.forEach((row, index) => {
    const n = index + 1;
    const share = Number(row.costSharePercent || 0);
    const isByProduct = Number(row.type) === OUTPUT_TYPE.byProduct;
    if (!row.productId) {
      issue(["outputs", index, "productId"], `خروجی ${n}: کالا انتخاب نشده است.`);
    } else if (row.productId === mainProductId) {
      issue(["outputs", index, "productId"], "محصول اصلی فرمول نمی‌تواند خروجی جانبی همان فرمول باشد.");
    } else if (seen.has(row.productId)) {
      issue(["outputs", index, "productId"], "یک کالا نمی‌تواند چند بار در خروجی‌های جانبی تکرار شود.");
    } else if (!(Number(row.quantity) > 0)) {
      issue(["outputs", index, "quantity"], `خروجی ${n}: مقدار باید بیشتر از صفر باشد.`);
    } else if (!(share >= 0 && share <= 100)) {
      issue(["outputs", index, "costSharePercent"], `خروجی ${n}: سهم بها باید بین ۰ تا ۱۰۰ باشد.`);
    } else if (isByProduct && share !== 0) {
      issue(["outputs", index, "costSharePercent"], `خروجی ${n}: محصول فرعی سهمی از بهای تمام‌شده ندارد.`);
    }
    if (row.productId) seen.add(row.productId);
    if (!isByProduct) coProductShare += share;
  });
  if (coProductShare >= 100)
    issue(["outputs"], "جمع سهم بهای محصولات همزاد باید کمتر از ۱۰۰ باشد تا سهمی برای محصول اصلی بماند.");
}

/** قواعد مسیر تولید، هم‌راستا با BOMOperationInputValidator و BOMOperationRules در بک‌اند */
function validateOperations(
  operations: BOMOperationRow[],
  issue: (path: (string | number)[], message: string) => void,
) {
  const seen = new Set<number>();
  operations.forEach((row, index) => {
    const n = index + 1;
    const sequence = Number(row.sequence);
    const setup = Number(row.setupMinutes || 0);
    const run = Number(row.runMinutes || 0);
    if (!(sequence > 0) || !Number.isInteger(sequence)) {
      issue(["operations", index, "sequence"], `عملیات ${n}: ترتیب باید عدد صحیح بیشتر از صفر باشد.`);
    } else if (seen.has(sequence)) {
      issue(["operations", index, "sequence"], "ترتیب عملیات در مسیر تولید تکراری است.");
    } else if (!row.title?.trim()) {
      issue(["operations", index, "title"], `عملیات ${n}: عنوان را وارد کنید.`);
    } else if (!row.workCenterId) {
      issue(["operations", index, "workCenterId"], `عملیات ${n}: مرکز کاری انتخاب نشده است.`);
    } else if (setup < 0 || run < 0) {
      issue(["operations", index, "runMinutes"], `عملیات ${n}: زمان نمی‌تواند منفی باشد.`);
    } else if (setup + run <= 0) {
      issue(["operations", index, "runMinutes"], `عملیات ${n}: زمان آماده‌سازی یا اجرا باید بیشتر از صفر باشد.`);
    }
    if (sequence > 0) seen.add(sequence);
  });
}

/** اولین پیام خطا به ترتیب فیلدهای فرم؛ برای نمایش در toast */
export const firstBOMError = (errors: Record<string, unknown>) =>
  firstFormError(errors, [
    "productId",
    "title",
    "version",
    "baseQuantity",
    "fromDate",
    "toDate",
    "details",
    "outputs",
    "operations",
  ]);
