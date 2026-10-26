"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Cog } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { NumberField, SelectField, SwitchField, TextField, TextareaField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { costCenterService } from "@/services/baseInfoService";
import { workCenterService } from "@/services/productionService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { CostCenterDto, WorkCenterDto } from "@/types/api";

// هم‌راستا با WorkCenterInputValidator در بک‌اند
const schema = z.object({
  code: z.string().trim().min(1, "کد الزامی است").max(20, "حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "عنوان الزامی است").max(100, "حداکثر ۱۰۰ کاراکتر"),
  costCenterId: z.number().nullable(),
  hoursPerDay: z
    .number({ message: "ساعت کاری روزانه را وارد کنید" })
    .positive("ساعت کاری روزانه باید بیشتر از صفر باشد")
    .max(24, "ساعت کاری روزانه حداکثر ۲۴ است"),
  hourlyRate: z.number({ message: "نرخ ساعتی را وارد کنید" }).min(0, "نرخ ساعتی نمی‌تواند منفی باشد"),
  isActive: z.boolean(),
  description: z.string().max(500, "حداکثر ۵۰۰ کاراکتر"),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = { code: "", title: "", costCenterId: null, hoursPerDay: 8, hourlyRate: 0, isActive: true, description: "" };

interface Props {
  mode: "create" | "edit";
  id?: number;
}

/** فرم تعریف و ویرایش مرکز کاری (ایستگاه، ماشین یا خط تولید) */
export default function WorkCenterForm({ mode, id }: Props) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `work-center-${mode}-form`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [current, setCurrent] = useState<WorkCenterDto | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [centers, existing] = await Promise.all([
          costCenterService.lookup(),
          mode === "edit" && id ? workCenterService.getById(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCostCenters(centers);
        if (existing) {
          setCurrent(existing);
          form.reset({
            code: existing.code,
            title: existing.title,
            costCenterId: existing.costCenterId ?? null,
            hoursPerDay: existing.hoursPerDay,
            hourlyRate: existing.hourlyRate,
            isActive: existing.isActive,
            description: existing.description ?? "",
          });
        }
      } catch (error) {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت اطلاعات مرکز کاری");
        if (mode === "edit") closeTab(activeTabId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // فقط با تغییر رکورد دوباره بارگذاری شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    const payload = { ...values, description: values.description || null };
    try {
      if (mode === "create") {
        await workCenterService.create(payload);
        toast.success("مرکز کاری با موفقیت ثبت شد");
      } else if (current) {
        await workCenterService.update(current.id, { ...payload, id: current.id, rowVersion: current.rowVersion });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت مرکز کاری" : "خطا در ویرایش مرکز کاری");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof Values, e));
    } finally {
      setSubmitting(false);
    }
  };

  // مرکز هزینه غیرفعال انتخاب نمی‌شود، مگر اینکه از قبل روی همین مرکز کاری باشد
  const costCenterOptions = costCenters
    .filter((c) => c.isActive || c.id === current?.costCenterId)
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` }));

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف مرکز کاری" : `ویرایش مرکز کاری: ${current?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت مرکز کاری" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات مرکز کاری" icon={Cog} className="max-w-3xl">
          <TextField control={form.control} name="code" label="کد" dir="ltr" required autoFocus={mode === "create"} />
          <TextField control={form.control} name="title" label="عنوان" required />
          <SelectField
            control={form.control}
            name="costCenterId"
            label="مرکز هزینه"
            options={costCenterOptions}
            noneLabel="بدون مرکز هزینه"
          />
          <NumberField
            control={form.control}
            name="hoursPerDay"
            label="ساعت کاری روزانه"
            required
            min={0}
            step={0.5}
            description="ظرفیت در دسترس در روز، برای گزارش بار مرکز کاری"
          />
          <NumberField
            control={form.control}
            name="hourlyRate"
            label="نرخ ساعتی (ریال)"
            required
            min={0}
            step={1000}
            description="دستمزد و سربار هر ساعت کارکرد؛ روی هر گزارش کارکرد ثبت می‌شود و تغییرش کارکرد گذشته را عوض نمی‌کند"
          />
          <TextareaField control={form.control} name="description" label="توضیحات" />
          {mode === "edit" && (
            <SwitchField
              control={form.control}
              name="isActive"
              label="مرکز کاری فعال است"
              description="مرکز غیرفعال در مسیر تولید فرمول‌های جدید انتخاب نمی‌شود"
            />
          )}
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
