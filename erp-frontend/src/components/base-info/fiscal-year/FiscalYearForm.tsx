"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import { DateField, SelectField, TextField } from "@/components/form/fields";
import { useTabs } from "@/providers/TabsProvider";
import { companyService, fiscalYearService, type EnumOption } from "@/services/baseInfoService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { CompanyDto, FiscalYearDto } from "@/types/api";

// هم‌راستا با CreateFiscalYearValidator و UpdateFiscalYearValidator در بک‌اند
const fiscalYearSchema = z
  .object({
    companyId: z.number({ invalid_type_error: "شرکت را انتخاب کنید" }).nullable(),
    title: z.string().trim().min(1, "عنوان الزامی است").max(50, "حداکثر ۵۰ کاراکتر"),
    startDate: z.string({ invalid_type_error: "تاریخ شروع الزامی است" }).nullable(),
    endDate: z.string({ invalid_type_error: "تاریخ پایان الزامی است" }).nullable(),
    status: z.number(),
  })
  .superRefine((v, ctx) => {
    if (v.companyId === null)
      ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت را انتخاب کنید" });
    if (!v.startDate)
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "تاریخ شروع الزامی است" });
    if (!v.endDate)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "تاریخ پایان الزامی است" });
    if (v.startDate && v.endDate && new Date(v.endDate) <= new Date(v.startDate))
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "تاریخ پایان باید بعد از تاریخ شروع باشد" });
  });

type FiscalYearFormValues = z.infer<typeof fiscalYearSchema>;

const OPEN = 1;

interface FiscalYearFormProps {
  mode: "create" | "edit";
  id?: number;
}

/** فرم مشترک تعریف و ویرایش سال مالی؛ بستن سال با تغییر وضعیت در ویرایش انجام می‌شود */
export default function FiscalYearForm({ mode, id }: FiscalYearFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = `fiscal-year-${mode}-form`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [statuses, setStatuses] = useState<EnumOption[]>([]);
  const [year, setYear] = useState<FiscalYearDto | null>(null);

  const form = useForm<FiscalYearFormValues>({
    resolver: zodResolver(fiscalYearSchema),
    defaultValues: { companyId: null, title: "", startDate: null, endDate: null, status: OPEN },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [allCompanies, allStatuses, current] = await Promise.all([
          companyService.lookup(),
          fiscalYearService.statuses(),
          mode === "edit" && id ? fiscalYearService.getById(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCompanies(allCompanies);
        setStatuses(allStatuses);
        if (current) {
          setYear(current);
          form.reset({
            companyId: current.companyId,
            title: current.title,
            startDate: current.startDate,
            endDate: current.endDate,
            status: current.status,
          });
        } else if (allCompanies.length === 1) {
          // بیشتر مجموعه‌ها یک شرکت دارند؛ انتخاب دستی لازم نیست
          form.reset({ ...form.getValues(), companyId: allCompanies[0].id });
        }
      } catch (error) {
        if (cancelled) return;
        handleApiError(error, "خطا در دریافت اطلاعات سال مالی");
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

  const onSubmit = async (values: FiscalYearFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await fiscalYearService.create({
          companyId: values.companyId!,
          title: values.title,
          startDate: values.startDate!,
          endDate: values.endDate!,
        });
        toast.success("سال مالی با موفقیت ثبت شد");
      } else if (year) {
        await fiscalYearService.update(year.id, {
          id: year.id,
          title: values.title,
          startDate: values.startDate!,
          endDate: values.endDate!,
          status: values.status,
          rowVersion: year.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      form.reset(values);
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, mode === "create" ? "خطا در ثبت سال مالی" : "خطا در ویرایش سال مالی");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof FiscalYearFormValues, e));
    } finally {
      setSubmitting(false);
    }
  };

  // شرکت غیرفعالِ سال موجود هم باید در ویرایش نمایش داده شود
  const companyOptions = companies.map((c) => ({ value: c.id, label: `${c.title} (${c.code})` }));
  if (year && !companies.some((c) => c.id === year.companyId))
    companyOptions.push({ value: year.companyId, label: year.companyTitle });

  return (
    <BaseFormLayout
      title={mode === "create" ? "تعریف سال مالی" : `ویرایش سال مالی: ${year?.title ?? ""}`}
      isLoading={loading}
      isSubmitting={submitting}
      isDirty={form.formState.isDirty}
      onSubmit={form.handleSubmit(onSubmit)}
      formId={FORM_ID}
      submitText={mode === "create" ? "ثبت سال مالی" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <FormSection title="اطلاعات سال مالی" icon={CalendarRange} className="max-w-3xl">
          <SelectField
            control={form.control}
            name="companyId"
            label="شرکت"
            options={companyOptions}
            disabled={mode === "edit"}
            description={mode === "edit" ? "شرکت سال مالی پس از ثبت تغییر نمی‌کند" : undefined}
            required
          />
          <TextField
            control={form.control}
            name="title"
            label="عنوان سال مالی"
            placeholder="مثال: ۱۴۰۵"
            required
            autoFocus={mode === "create"}
          />
          <DateField control={form.control} name="startDate" label="تاریخ شروع" required />
          <DateField control={form.control} name="endDate" label="تاریخ پایان" required />
          {mode === "edit" && (
            <SelectField
              control={form.control}
              name="status"
              label="وضعیت"
              options={statuses}
              description="در سال بسته، سند انبار ثبت، قطعی یا ابطال نمی‌شود"
            />
          )}
        </FormSection>
      </Form>
    </BaseFormLayout>
  );
}
