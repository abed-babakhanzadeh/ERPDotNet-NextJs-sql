"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Coins } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { SelectField, SwitchField, TextField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { costCenterService, type EnumOption } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { CostCenterDto } from "@/types/api";

// هم‌راستا با CreateCostCenterValidator و UpdateCostCenterValidator در بک‌اند
const costCenterSchema = z.object({
  code: z.string().trim().min(1, "کد الزامی است").max(20, "حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "عنوان الزامی است").max(100, "حداکثر ۱۰۰ کاراکتر"),
  type: z.number().min(1, "نوع را انتخاب کنید"),
  parentId: z.number().nullable(),
  isActive: z.boolean(),
});

type CostCenterFormValues = z.infer<typeof costCenterSchema>;

const EMPTY: CostCenterFormValues = { code: "", title: "", type: 1, parentId: null, isActive: true };

interface CostCenterFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش مرکز هزینه درختی */
export default function CostCenterForm({ mode, id }: CostCenterFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `cost-center-${mode}-form`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [centers, setCenters] = useState<CostCenterDto[]>([]);
  const [types, setTypes] = useState<EnumOption[]>([]);
  const [center, setCenter] = useState<CostCenterDto | null>(null);

  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, allTypes, current] = await Promise.all([
          costCenterService.lookup(),
          costCenterService.types(),
          mode === "edit" && id ? costCenterService.getById(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCenters(all);
        setTypes(allTypes);
        if (current) {
          setCenter(current);
          form.reset({
            code: current.code,
            title: current.title,
            type: current.type,
            parentId: current.parentId ?? null,
            isActive: current.isActive,
          });
        }
      } catch (error) {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت مراکز هزینه");
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

  const onSubmit = async (values: CostCenterFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await costCenterService.create({
          code: values.code,
          title: values.title,
          type: values.type,
          parentId: values.parentId,
        });
        toast.success("مرکز هزینه با موفقیت ثبت شد");
      } else if (center) {
        await costCenterService.update(center.id, {
          ...values,
          id: center.id,
          rowVersion: center.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت مرکز هزینه" : "خطا در ویرایش مرکز هزینه");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof CostCenterFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = centers
    .filter((c) => c.id !== id)
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` }));

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف مرکز هزینه" : `ویرایش مرکز هزینه: ${center?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت مرکز هزینه" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات مرکز هزینه" icon={Coins} className="max-w-3xl">
          <TextField control={form.control} name="code" label="کد" dir="ltr" required autoFocus={mode === "create"} />
          <TextField control={form.control} name="title" label="عنوان" required />
          <SelectField control={form.control} name="type" label="نوع مرکز" options={types} required />
          <SelectField
            control={form.control}
            name="parentId"
            label="مرکز والد"
            options={parentOptions}
            noneLabel="بدون والد (سطح اول)"
          />
          {mode === "edit" && (
            <SwitchField
              control={form.control}
              name="isActive"
              label="مرکز هزینه فعال است"
              description="مرکز غیرفعال در انتخاب‌ها نشان داده نمی‌شود"
            />
          )}
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
