"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Calculator, Factory, Layers, Lock, Warehouse } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { FormSection } from "@/components/form/FormSection";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/StatusBadge";
import { usePermissions } from "@/providers/PermissionProvider";
import { settingsService } from "@/services/settingsService";
import { handleApiError } from "@/lib/error-handling";
import { cn } from "@/lib/utils";
import type { ValuationSettingsDto } from "@/types/api";

type Values = { method: number; level: number; productionCostBasis: number };
type Option = ValuationSettingsDto["methods"][number];

/** توضیح کامل هر گزینه؛ مقدار عددی هم‌راستا با enumهای ValuationMethod، ValuationLevel و ProductionCostBasis */
const METHOD_HELP: Record<number, string> = {
  1: "هر رسید با بها، میانگین را دوباره حساب می‌کند: (ارزش موجودی + ارزش رسید) ÷ (مقدار موجودی + مقدار رسید). هر حواله با میانگینِ لحظه قطعی شدن ارزش می‌گیرد، پس گزارش ریالی و بهای تمام‌شده همیشه به‌روز است. ترتیب محاسبه ترتیب قطعی شدن اسناد است، نه تاریخ آن‌ها؛ سند تاریخ‌گذشته میانگین گذشته را بازنویسی نمی‌کند.",
  2: "در طول دوره فقط مقدار ثبت می‌شود و حواله‌ها بی‌بها می‌مانند. در پایان دوره با «ریالی کردن»، میانگین کل دوره = (ارزش اول دوره + ارزش رسیدهای دوره) ÷ (مقدار اول دوره + مقدار رسیدهای دوره) محاسبه و روی همه حواله‌های دوره نوشته می‌شود. در نرم‌افزارهای ایرانی رایج است؛ تا ریالی کردن انجام نشود، گزارش ریالی و بهای تمام‌شده ناقص است.",
  3: "هر رسید یک «لایه بها» با بهای خودش می‌سازد و هر حواله از قدیمی‌ترین لایه باز مصرف می‌کند؛ بهای خروج همان بهای واقعی خرید است. «قدیمی‌ترین» یعنی زودتر قطعی‌شده، نه تاریخ سند. ابطال حواله همان لایه‌های مصرف‌شده را برمی‌گرداند و ابطال رسید اول از لایه خودش برمی‌دارد. در سطح «انبار»، انتقال لایه‌ها را با همان بها به انبار مقصد می‌برد؛ در سطح «شرکت»، انتقال به لایه‌ها دست نمی‌زند. موجودی‌ای که پیش از ارزش‌گذاری ثبت شده، یک لایه «اول دوره» با ارزش ثبت‌شده‌اش می‌شود و اول مصرف می‌شود.",
};

const LEVEL_HELP: Record<number, string> = {
  1: "یک میانگین برای هر کالا در همه انبارهای یک شرکت. انتقال بین انبارها بها را تغییر نمی‌دهد. ساده‌تر و رایج‌تر است. شرکت‌های مختلف هیچ‌وقت میانگین مشترک ندارند.",
  2: "هر انبار میانگین خودش را دارد. انتقال، کالا را با بهای میانگین مبدأ به مقصد می‌برد و میانگین مقصد را تغییر می‌دهد. برای شعبه‌ها یا انبارهایی با هزینه خرید یا حمل متفاوت مناسب است.",
};

const BASIS_HELP: Record<number, string> = {
  1: "بهای محصول = بهای قطعی‌شده حواله‌های مواد سفارش (منهای برگشت‌ها) ÷ مقدار رسید محصول و ضایعات. در رسید چندمرحله‌ای، هر رسید باقی‌مانده بهای مواد را می‌برد تا جمع آن‌ها برابر بهای مواد شود؛ پس حواله مواد را پیش از رسید محصول قطعی کنید. دستمزد و سربار بعداً در حسابداری اضافه می‌شود.",
  2: "علاوه بر مواد، زمان آماده‌سازی و اجرای ثبت‌شده در گزارش‌های کارکرد × نرخ ساعتی مرکز کاری (دستمزد و سربار) به بهای محصول اضافه می‌شود. نرخ را در تعریف هر مرکز کاری وارد کنید؛ نرخ در لحظه ثبت روی هر گزارش کارکرد ذخیره می‌شود، پس تغییر بعدی نرخ کارکرد گذشته را عوض نمی‌کند. کارکرد را پیش از رسید محصول ثبت کنید؛ کارکردی که بعد از آخرین رسید ثبت شود، در بخش «بهای تمام‌شده» سفارش به‌عنوان بهای جذب‌نشده دیده می‌شود.",
};

const DEFAULTS: Values = { method: 1, level: 1, productionCostBasis: 1 };

function OptionGroup({
  name,
  label,
  options,
  help,
  value,
  onChange,
  locked,
  readOnly,
}: {
  name: keyof Values;
  /** نام دسترس‌پذیر گروه برای صفحه‌خوان */
  label: string;
  options: Option[];
  help: Record<number, string>;
  value: number;
  onChange: (value: number) => void;
  locked: boolean;
  readOnly: boolean;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      className="gap-3 sm:col-span-2"
      disabled={readOnly}
    >
      {options.map((o) => {
        const disabled = readOnly || !o.implemented || (locked && o.value !== value);
        const id = `${name}-${o.value}`;
        return (
          <Label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border p-4 font-normal transition-colors",
              value === o.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
            )}
          >
            <RadioGroupItem id={id} value={String(o.value)} disabled={disabled} className="mt-1 shrink-0" />
            <span className="space-y-1.5">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                {o.title}
                {o.value === DEFAULTS[name] && <StatusBadge tone="info" icon={false} label="پیش‌فرض" />}
                {!o.implemented && <StatusBadge tone="neutral" icon={false} label="در دست ساخت" />}
              </span>
              <span className="block text-xs leading-6 text-muted-foreground">{help[o.value]}</span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}

/** تنظیمات سراسری ارزش‌گذاری موجودی */
export default function InventoryValuationSettingsPage() {
  const { hasPermission } = usePermissions();
  const readOnly = !hasPermission("Settings.InventoryValuation.Edit");
  const [settings, setSettings] = useState<ValuationSettingsDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ defaultValues: DEFAULTS });
  const values = useWatch({ control: form.control }) as Values;

  const load = async () => {
    try {
      const s = await settingsService.getValuation();
      setSettings(s);
      form.reset({ method: s.method, level: s.level, productionCostBasis: s.productionCostBasis });
    } catch (error) {
      handleApiError(error, "خطا در دریافت تنظیمات ارزش‌گذاری");
    }
  };

  useEffect(() => {
    load();
    // فقط یک بار
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = form.handleSubmit(async (v) => {
    if (!settings) return;
    setSubmitting(true);
    try {
      await settingsService.updateValuation({ ...v, rowVersion: settings.rowVersion });
      toast.success("تنظیمات ارزش‌گذاری ذخیره شد");
      await load();
    } catch (error) {
      handleApiError(error, "خطا در ذخیره تنظیمات ارزش‌گذاری");
    } finally {
      setSubmitting(false);
    }
  });

  const set = (key: keyof Values) => (v: number) => form.setValue(key, v, { shouldDirty: true });
  const locked = settings?.isLocked ?? false;

  return (
    <ProtectedPage permission="Settings.InventoryValuation">
      <BaseFormLayout
        title="تنظیمات ارزش‌گذاری موجودی"
        isLoading={!settings}
        isSubmitting={submitting}
        isDirty={form.formState.isDirty}
        onSubmit={onSubmit}
        formId="valuation-settings-form"
        submitText="ذخیره تنظیمات"
        showActions={!readOnly}
      >
        {settings && (
          <div className="space-y-4">
            {locked && (
              <div role="status" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  برای این سیستم سند ارزش‌گذاری‌شده ثبت شده است؛ روش و سطح ارزش‌گذاری قفل‌اند، چون تغییرشان وسط کار تاریخچه بها را
                  بی‌معنی می‌کند. مبنای بهای تولید قابل تغییر است و فقط روی رسیدهای بعدی اثر دارد.
                </span>
              </div>
            )}
            <FormSection title="روش ارزش‌گذاری" icon={Calculator}>
              <OptionGroup name="method" label="روش ارزش‌گذاری" options={settings.methods} help={METHOD_HELP} value={values.method} onChange={set("method")} locked={locked} readOnly={readOnly} />
            </FormSection>
            <FormSection title="سطح میانگین بها" icon={Warehouse}>
              <OptionGroup name="level" label="سطح میانگین بها" options={settings.levels} help={LEVEL_HELP} value={values.level} onChange={set("level")} locked={locked} readOnly={readOnly} />
            </FormSection>
            <FormSection title="بهای رسید محصول تولیدی" icon={Factory}>
              <OptionGroup
                name="productionCostBasis"
                label="بهای رسید محصول تولیدی"
                options={settings.productionCostBases}
                help={BASIS_HELP}
                value={values.productionCostBasis}
                onChange={set("productionCostBasis")}
                locked={false}
                readOnly={readOnly}
              />
            </FormSection>
            <FormSection title="نکته‌ها" icon={Layers}>
              <ul className="list-disc space-y-1.5 ps-5 text-xs leading-6 text-muted-foreground sm:col-span-2">
                <li>رسید با نوع سند «ریالی» و بدون مرجع، بهای واحد اجباری دارد. رسید غیرریالی، اضافی انبارگردانی و برگشت با میانگین فعلی ثبت می‌شوند و نرخ را تغییر نمی‌دهند.</li>
                <li>ابطال سند قطعی‌شده دقیقاً با همان بهای ثبت اولیه برمی‌گردد.</li>
                <li>موجودی‌ای که پیش از فعال شدن ارزش‌گذاری ثبت شده، با ارزش صفر در میانگین حساب می‌شود.</li>
              </ul>
            </FormSection>
          </div>
        )}
      </BaseFormLayout>
    </ProtectedPage>
  );
}
