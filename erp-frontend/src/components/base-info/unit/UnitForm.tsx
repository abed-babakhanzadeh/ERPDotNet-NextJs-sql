"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Ruler } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { NumberField, SelectField, SwitchField, TextField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { unitService } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { Unit } from "@/types/baseInfo";

// هم‌راستا با CreateUnitValidator و UpdateUnitValidator در بک‌اند
const unitSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان الزامی است").max(50, "حداکثر ۵۰ کاراکتر"),
    symbol: z.string().trim().min(1, "نماد الزامی است").max(10, "حداکثر ۱۰ کاراکتر"),
    precision: z.coerce
      .number({ invalid_type_error: "عدد وارد کنید" })
      .int("عدد صحیح وارد کنید")
      .min(0, "حداقل ۰")
      .max(5, "حداکثر ۵"),
    isActive: z.boolean(),
    baseUnitId: z.number().nullable(),
    conversionFactor: z.coerce.number({ invalid_type_error: "ضریب را وارد کنید" }),
  })
  .refine((v) => v.baseUnitId === null || v.conversionFactor > 0, {
    path: ["conversionFactor"],
    message: "ضریب تبدیل باید بزرگ‌تر از صفر باشد",
  });

type UnitFormValues = z.infer<typeof unitSchema>;

const EMPTY: UnitFormValues = {
  title: "",
  symbol: "",
  precision: 0,
  isActive: true,
  baseUnitId: null,
  conversionFactor: 1,
};

interface UnitFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش واحد سنجش */
export default function UnitForm({ mode, id }: UnitFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `unit-${mode}-form`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, current] = await Promise.all([
          unitService.lookup(),
          mode === "edit" && id ? unitService.getById(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setUnits(all);
        if (current) {
          setUnit(current);
          form.reset({
            title: current.title,
            symbol: current.symbol,
            precision: current.precision,
            isActive: current.isActive,
            baseUnitId: current.baseUnitId,
            conversionFactor: current.conversionFactor || 1,
          });
        }
      } catch (error) {
        if (cancelled) return;
        handleApiError(error, mode === "edit" ? "خطا در دریافت اطلاعات واحد" : "خطا در دریافت واحدها");
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

  const [baseUnitId, conversionFactor, title] = useWatch({
    control: form.control,
    name: ["baseUnitId", "conversionFactor", "title"],
  });
  const baseUnit = units.find((u) => u.id === baseUnitId);

  const onSubmit = async (values: UnitFormValues) => {
    // واحد اصلی همیشه ضریب ۱ دارد؛ ضریب فقط برای واحد فرعی معنا دارد
    const conversion = values.baseUnitId === null ? 1 : values.conversionFactor;
    setSubmitting(true);
    try {
      if (mode === "create") {
        await unitService.create({
          title: values.title,
          symbol: values.symbol,
          precision: values.precision,
          baseUnitId: values.baseUnitId,
          conversionFactor: conversion,
        });
        toast.success("واحد با موفقیت ایجاد شد");
      } else if (unit) {
        await unitService.update(unit.id, {
          id: unit.id,
          title: values.title,
          symbol: values.symbol,
          precision: values.precision,
          isActive: values.isActive,
          baseUnitId: values.baseUnitId,
          conversionFactor: conversion,
          rowVersion: unit.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت واحد" : "خطا در ویرایش واحد");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof UnitFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  const baseUnitOptions = units
    .filter((u) => u.id !== id)
    .map((u) => ({ value: u.id, label: `${u.title} (${u.symbol})` }));

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف واحد جدید" : `ویرایش واحد: ${unit?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت واحد" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات واحد سنجش" icon={Ruler} className="max-w-3xl">
          <TextField
            control={form.control}
            name="title"
            label="عنوان واحد"
            placeholder="مثال: کیلوگرم"
            required
            autoFocus={mode === "create"}
          />
          <TextField
            control={form.control}
            name="symbol"
            label="نماد"
            placeholder="مثال: kg"
            dir="ltr"
            required
          />
          <NumberField
            control={form.control}
            name="precision"
            label="تعداد رقم اعشار"
            description="مقادیر این واحد با چند رقم اعشار ثبت شوند (۰ تا ۵)"
            min={0}
            step={1}
            required
          />
          {mode === "edit" && (
            <SwitchField
              control={form.control}
              name="isActive"
              label="واحد فعال است"
              description="واحد غیرفعال در انتخاب‌ها نشان داده نمی‌شود"
              className="self-end"
            />
          )}

          <SelectField
            control={form.control}
            name="baseUnitId"
            label="واحد پایه"
            options={baseUnitOptions}
            noneLabel="بدون واحد پایه (واحد اصلی)"
            description="برای واحد فرعی، واحدی که به آن تبدیل می‌شود"
            className="sm:col-start-1"
          />
          <NumberField
            control={form.control}
            name="conversionFactor"
            label="ضریب تبدیل"
            step={0.001}
            min={0}
            disabled={baseUnitId === null}
            required={baseUnitId !== null}
            description={
              baseUnit
                ? `۱ ${title || "واحد جدید"} = ${conversionFactor || "؟"} ${baseUnit.title}`
                : "فقط برای واحد فرعی"
            }
          />
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
