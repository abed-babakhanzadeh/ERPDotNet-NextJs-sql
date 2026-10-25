"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { SwitchField, TextField, TextareaField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { companyService } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { CompanyDto } from "@/types/api";

const optionalDigits = (length: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || length.test(v), message);

// هم‌راستا با CreateCompanyValidator و UpdateCompanyValidator در بک‌اند
const companySchema = z.object({
  code: z.string().trim().min(1, "کد الزامی است").max(20, "حداکثر ۲۰ کاراکتر"),
  title: z.string().trim().min(1, "نام شرکت الزامی است").max(200, "حداکثر ۲۰۰ کاراکتر"),
  nationalId: optionalDigits(/^[0-9]{11}$/, "شناسه ملی باید ۱۱ رقم باشد"),
  economicCode: optionalDigits(/^[0-9]{12,14}$/, "کد اقتصادی باید ۱۲ تا ۱۴ رقم باشد"),
  registrationNumber: z.string().trim().max(20, "حداکثر ۲۰ کاراکتر"),
  phone: z.string().trim().max(30, "حداکثر ۳۰ کاراکتر"),
  address: z.string().trim().max(500, "حداکثر ۵۰۰ کاراکتر"),
  isActive: z.boolean(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const EMPTY: CompanyFormValues = {
  code: "",
  title: "",
  nationalId: "",
  economicCode: "",
  registrationNumber: "",
  phone: "",
  address: "",
  isActive: true,
};

const orNull = (v: string) => (v === "" ? null : v);

interface CompanyFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش شرکت */
export default function CompanyForm({ mode, id }: CompanyFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `company-${mode}-form`;

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<CompanyDto | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let cancelled = false;
    companyService
      .getById(id)
      .then((current) => {
        if (cancelled) return;
        setCompany(current);
        form.reset({
          code: current.code,
          title: current.title,
          nationalId: current.nationalId ?? "",
          economicCode: current.economicCode ?? "",
          registrationNumber: current.registrationNumber ?? "",
          phone: current.phone ?? "",
          address: current.address ?? "",
          isActive: current.isActive,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت اطلاعات شرکت");
        closeTab(activeTabId);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // فقط با تغییر رکورد دوباره بارگذاری شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const onSubmit = async (values: CompanyFormValues) => {
    const payload = {
      code: values.code,
      title: values.title,
      nationalId: orNull(values.nationalId),
      economicCode: orNull(values.economicCode),
      registrationNumber: orNull(values.registrationNumber),
      phone: orNull(values.phone),
      address: orNull(values.address),
    };
    setSubmitting(true);
    try {
      if (mode === "create") {
        await companyService.create(payload);
        toast.success("شرکت با موفقیت ثبت شد");
      } else if (company) {
        await companyService.update(company.id, {
          ...payload,
          id: company.id,
          isActive: values.isActive,
          rowVersion: company.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت شرکت" : "خطا در ویرایش شرکت");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof CompanyFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف شرکت" : `ویرایش شرکت: ${company?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت شرکت" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات شرکت" icon={Building2} className="max-w-3xl">
          <TextField control={form.control} name="code" label="کد شرکت" dir="ltr" required autoFocus={mode === "create"} />
          <TextField control={form.control} name="title" label="نام شرکت" required />
          <TextField control={form.control} name="nationalId" label="شناسه ملی" dir="ltr" description="۱۱ رقم" />
          <TextField control={form.control} name="economicCode" label="کد اقتصادی" dir="ltr" />
          <TextField control={form.control} name="registrationNumber" label="شماره ثبت" dir="ltr" />
          <TextField control={form.control} name="phone" label="تلفن" dir="ltr" />
          <TextareaField control={form.control} name="address" label="نشانی" className="sm:col-span-full" />
          {mode === "edit" && (
            <SwitchField
              control={form.control}
              name="isActive"
              label="شرکت فعال است"
              description="شرکت غیرفعال در انتخاب‌ها نشان داده نمی‌شود"
            />
          )}
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
