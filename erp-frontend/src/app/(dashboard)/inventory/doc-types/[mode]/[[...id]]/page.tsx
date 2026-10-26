"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { FileCog, Link2 } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { SelectField, SwitchField, TextField, type SelectOption } from "@/components/form/fields";

import inventoryService from "@/services/inventoryService";
import { InventoryDocTypeDto } from "@/types/inventory";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";

const formSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  nature: z.coerce.number().min(1, "انتخاب ماهیت الزامی است"),
  numberingScope: z.coerce
    .number()
    .min(1, "انتخاب دامنه شماره‌گذاری الزامی است"),
  requiredPermissionName: z.string().optional(),
  affectsCost: z.boolean().default(false),
  isReferenceRequired: z.boolean().default(false),
  allowsUnreleasedBatches: z.boolean().default(false),
  allowedReferenceEntityNames: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

/** enumهای بک‌اند با key/label و حروف بزرگ یا کوچک برمی‌گردند */
function toOptions(items: any[]): SelectOption[] {
  return items.map((opt) => ({
    value: opt.value ?? opt.Value,
    label: opt.key ?? opt.Key ?? opt.label ?? opt.Label ?? "بدون عنوان",
  }));
}

export default function DocTypeFormPage() {
  const router = useRouter();
  const params = useParams();
  const mode = params.mode as "create" | "edit";
  const id = params.id?.[0];

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docData, setDocData] = useState<InventoryDocTypeDto | null>(null);

  const [natureOptions, setNatureOptions] = useState<any[]>([]);
  const [scopeOptions, setScopeOptions] = useState<any[]>([]);
  const [systemEntities, setSystemEntities] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      nature: 0,
      numberingScope: 1,
      requiredPermissionName: "",
      affectsCost: true,
      isReferenceRequired: false,
      allowsUnreleasedBatches: false,
      allowedReferenceEntityNames: [],
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [natures, scopes, entities] = await Promise.all([
          inventoryService.getInventoryNatures(),
          inventoryService.getNumberingScopes(),
          inventoryService.getSystemEntities(),
        ]);

        setNatureOptions(Array.isArray(natures) ? natures : []);
        setScopeOptions(Array.isArray(scopes) ? scopes : []);
        setSystemEntities(Array.isArray(entities) ? entities : []);

        if (mode === "edit" && id) {
          setLoading(true);
          const data = await inventoryService.getDocTypeById(Number(id));
          setDocData(data);
          form.reset({
            title: data.title,
            nature: data.natureValue,
            numberingScope: data.numberingScope,
            requiredPermissionName: data.requiredPermissionName || "",
            affectsCost: data.affectsCost,
            isReferenceRequired: data.isReferenceRequired,
            allowsUnreleasedBatches: data.allowsUnreleasedBatches ?? false,
            allowedReferenceEntityNames: data.allowedReferenceEntityNames || [],
          });
        }
      } catch (error) {
        handleApiError(error, "خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mode, id, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await inventoryService.createDocType(values);
        toast.success("نوع سند با موفقیت ایجاد شد");
      } else {
        if (!docData) return;
        await inventoryService.updateDocType(Number(id), {
          ...values,
          id: Number(id),
          rowVersion: docData.rowVersion,
        });
        toast.success("ویرایش با موفقیت انجام شد");
      }
      form.reset(values);
      router.push("/inventory/doc-types");
    } catch (error: any) {
      handleApiError(error, "خطا در عملیات");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof FormValues, e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title={
        mode === "create"
          ? "تعریف نوع سند جدید"
          : `ویرایش نوع سند: ${docData?.title || ""}`
      }
      isLoading={loading}
      isSubmitting={isSubmitting}
      isDirty={form.formState.isDirty}
      formId="doctype-form"
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={() => router.push("/inventory/doc-types")}
      submitText={mode === "create" ? "ثبت" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="مشخصات نوع سند" icon={FileCog}>
          <TextField
            control={form.control}
            name="title"
            label="عنوان نوع سند"
            placeholder="مثال: رسید خرید داخلی"
            required
          />
          <SelectField
            control={form.control}
            name="nature"
            label="ماهیت سند"
            options={toOptions(natureOptions)}
            disabled={mode === "edit"}
            description={
              mode === "edit" ? "ماهیت سند پس از ایجاد قابل تغییر نیست." : undefined
            }
            required
          />
          <SelectField
            control={form.control}
            name="numberingScope"
            label="روش شماره‌گذاری"
            options={toOptions(scopeOptions)}
            required
          />
          <TextField
            control={form.control}
            name="requiredPermissionName"
            label="نام مجوز اختصاصی"
            placeholder="مثال: Inventory.SpecialDoc.Create"
            dir="ltr"
            description="اگر پر شود، کاربر باید حتما این مجوز را داشته باشد."
          />
          <SwitchField
            control={form.control}
            name="affectsCost"
            label="تأثیر در بهای تمام‌شده (ریالی)"
            description="رسید ریالی بدون مرجع، بهای واحد اجباری دارد و نرخ میانگین را تغییر می‌دهد. رسید غیرریالی با میانگین فعلی ثبت می‌شود و نرخ را تغییر نمی‌دهد."
          />
          <SwitchField
            control={form.control}
            name="isReferenceRequired"
            label="عطف (رفرنس) اجباری است"
            description="کاربر باید مبنای سند (مثلاً پروژه یا مرکز هزینه) را مشخص کند."
          />
          <SwitchField
            control={form.control}
            name="allowsUnreleasedBatches"
            label="مجاز به خروج بچ قرنطینه/مردود"
            description="فقط برای اسنادی مثل برگشت به تأمین‌کننده یا ضایعات؛ حواله‌های عادی فقط بچ تأییدشده QC را می‌پذیرند."
          />
        </FormSection>

        <FormSection title="موجودیت‌های مجاز برای عطف" icon={Link2} columns={3}>
          <FormField
            control={form.control}
            name="allowedReferenceEntityNames"
            render={({ field }) => (
              <>
                {systemEntities.map((entity) => {
                  // خواندن هر نوع Case (بزرگ و کوچک) برای جلوگیری از undefined
                  const entityValue: string =
                    entity.value || entity.Value || entity.id || entity.Id;
                  const entityLabel: string =
                    entity.label || entity.Label || entity.title || entity.Title;
                  const checked = field.value?.includes(entityValue) ?? false;
                  return (
                    <FormItem
                      key={entityValue}
                      className="flex flex-row items-center gap-2 space-y-0 rounded-md border px-3 py-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            field.onChange(
                              next
                                ? [...(field.value || []), entityValue]
                                : (field.value || []).filter((v) => v !== entityValue),
                            )
                          }
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">{entityLabel}</FormLabel>
                    </FormItem>
                  );
                })}
                {systemEntities.length === 0 && (
                  <p className="text-sm text-muted-foreground">موجودیتی تعریف نشده است.</p>
                )}
              </>
            )}
          />
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
