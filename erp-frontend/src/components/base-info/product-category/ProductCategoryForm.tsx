"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FolderTree } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { SelectField, SwitchField, TextField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { productCategoryService } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { ProductCategoryDto } from "@/types/api";

// هم‌راستا با CreateProductCategoryValidator و UpdateProductCategoryValidator در بک‌اند
const productCategorySchema = z.object({
  code: z.string().trim().min(1, "کد الزامی است").max(20, "حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "عنوان الزامی است").max(100, "حداکثر ۱۰۰ کاراکتر"),
  parentId: z.number().nullable(),
  isActive: z.boolean(),
});

type ProductCategoryFormValues = z.infer<typeof productCategorySchema>;

const EMPTY: ProductCategoryFormValues = { code: "", title: "", parentId: null, isActive: true };

interface ProductCategoryFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش گروه کالای درختی */
export default function ProductCategoryForm({ mode, id }: ProductCategoryFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `product-category-${mode}-form`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [category, setCategory] = useState<ProductCategoryDto | null>(null);

  const form = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(productCategorySchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, current] = await Promise.all([
          productCategoryService.lookup(),
          mode === "edit" && id ? productCategoryService.getById(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCategories(all);
        if (current) {
          setCategory(current);
          form.reset({
            code: current.code,
            title: current.title,
            parentId: current.parentId ?? null,
            isActive: current.isActive,
          });
        }
      } catch (error) {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت گروه‌های کالا");
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

  const onSubmit = async (values: ProductCategoryFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await productCategoryService.create({
          code: values.code,
          title: values.title,
          parentId: values.parentId,
        });
        toast.success("گروه کالا با موفقیت ثبت شد");
      } else if (category) {
        await productCategoryService.update(category.id, {
          ...values,
          id: category.id,
          rowVersion: category.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت گروه کالا" : "خطا در ویرایش گروه کالا");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof ProductCategoryFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = categories
    .filter((c) => c.id !== id)
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` }));

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف گروه کالا" : `ویرایش گروه کالا: ${category?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت گروه کالا" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات گروه کالا" icon={FolderTree} className="max-w-3xl">
          <TextField control={form.control} name="code" label="کد" dir="ltr" required autoFocus={mode === "create"} />
          <TextField control={form.control} name="title" label="عنوان" required />
          <SelectField
            control={form.control}
            name="parentId"
            label="گروه والد"
            options={parentOptions}
            noneLabel="بدون والد (سطح اول)"
          />
          {mode === "edit" && (
            <SwitchField
              control={form.control}
              name="isActive"
              label="گروه کالا فعال است"
              description="گروه غیرفعال در انتخاب‌ها نشان داده نمی‌شود"
            />
          )}
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
