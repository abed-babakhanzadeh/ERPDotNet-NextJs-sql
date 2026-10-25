"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ListChecks, Palette } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { SwitchField, TextField } from "@/components/form/fields";
import EditableGrid, { type GridColumn } from "@/components/form/EditableGrid";
import { useTabs } from "@/providers/TabsProvider";
import { productAttributeService } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { ProductAttributeDto } from "@/types/api";

// هم‌راستا با CreateProductAttributeValidator و UpdateProductAttributeValidator در بک‌اند
const valueSchema = z.object({
  id: z.string(),
  valueId: z.number().optional(),
  code: z.string().trim().min(1, "کد مقدار الزامی است").max(20, "کد مقدار حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "عنوان مقدار الزامی است").max(100, "عنوان مقدار حداکثر ۱۰۰ کاراکتر"),
});

const productAttributeSchema = z.object({
  code: z.string().trim().min(1, "کد الزامی است").max(20, "حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "عنوان الزامی است").max(100, "حداکثر ۱۰۰ کاراکتر"),
  isActive: z.boolean(),
  values: z
    .array(valueSchema)
    .min(1, "ویژگی باید دست‌کم یک مقدار داشته باشد")
    .refine(
      (rows) => new Set(rows.map((r) => r.code.trim().toLowerCase())).size === rows.length,
      "کد مقادیر ویژگی نباید تکراری باشد",
    ),
});

type ProductAttributeFormValues = z.infer<typeof productAttributeSchema>;
type ValueRow = ProductAttributeFormValues["values"][number];

const newRow = (): ValueRow => ({ id: Math.random().toString(36).slice(2, 11), code: "", title: "" });

const EMPTY: ProductAttributeFormValues = { code: "", title: "", isActive: true, values: [newRow()] };

const valueColumns: GridColumn<ValueRow>[] = [
  { key: "code", title: "کد مقدار", type: "text", width: "35%", required: true },
  { key: "title", title: "عنوان مقدار", type: "text", required: true },
];

interface ProductAttributeFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش ویژگی کالا و مقادیر آن */
export default function ProductAttributeForm({ mode, id }: ProductAttributeFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `product-attribute-${mode}-form`;

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [attribute, setAttribute] = useState<ProductAttributeDto | null>(null);

  const form = useForm<ProductAttributeFormValues>({
    resolver: zodResolver(productAttributeSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let cancelled = false;
    productAttributeService
      .getById(id)
      .then((current) => {
        if (cancelled) return;
        setAttribute(current);
        form.reset({
          code: current.code,
          title: current.title,
          isActive: current.isActive,
          values: current.values.map((v) => ({ id: String(v.id), valueId: v.id, code: v.code, title: v.title })),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت ویژگی کالا");
        closeTab(activeTabId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // فقط با تغییر رکورد دوباره بارگذاری شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const onSubmit = async (values: ProductAttributeFormValues) => {
    setSubmitting(true);
    const payload = values.values.map((v) => ({ id: v.valueId ?? null, code: v.code, title: v.title }));
    try {
      if (mode === "create") {
        await productAttributeService.create({ code: values.code, title: values.title, values: payload });
        toast.success("ویژگی کالا با موفقیت ثبت شد");
      } else if (attribute) {
        await productAttributeService.update(attribute.id, {
          id: attribute.id,
          code: values.code,
          title: values.title,
          isActive: values.isActive,
          values: payload,
          rowVersion: attribute.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت ویژگی کالا" : "خطا در ویرایش ویژگی کالا");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof ProductAttributeFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  const rows = form.watch("values");
  const valuesError = form.formState.errors.values;
  const valuesMessage =
    valuesError?.message ??
    valuesError?.root?.message ??
    (Array.isArray(valuesError)
      ? valuesError.flatMap((e) => (e ? [e.code?.message, e.title?.message] : [])).find(Boolean)
      : undefined);

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف ویژگی کالا" : `ویرایش ویژگی کالا: ${attribute?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت ویژگی" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <div className="flex max-w-3xl flex-col gap-4">
          <FormSection title="اطلاعات ویژگی" icon={Palette}>
            <TextField control={form.control} name="code" label="کد" dir="ltr" required autoFocus={mode === "create"} />
            <TextField control={form.control} name="title" label="عنوان" required />
            {mode === "edit" && (
              <SwitchField
                control={form.control}
                name="isActive"
                label="ویژگی فعال است"
                description="ویژگی غیرفعال در ساخت تنوع کالا نشان داده نمی‌شود"
              />
            )}
          </FormSection>
          <FormSection title="مقادیر" icon={ListChecks}>
            <div className="h-72 sm:col-span-full">
              <EditableGrid<ValueRow>
                columns={valueColumns}
                data={rows}
                onChange={(next) => form.setValue("values", next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
                onAddRow={newRow}
                permissions={{ add: true, delete: true, edit: false, view: false }}
              />
            </div>
            {valuesMessage && <p className="text-sm text-destructive sm:col-span-full">{valuesMessage}</p>}
          </FormSection>
        </div>
      </Form>
    </BaseFormLayout>
  );
}
