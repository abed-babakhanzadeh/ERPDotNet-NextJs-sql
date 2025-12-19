"use client";

import { useState, useEffect, useMemo } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";
import { Ruler } from "lucide-react";
import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { useTabs } from "@/providers/TabsProvider";
import { useFormPersist } from "@/hooks/useFormPersist";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";

export default function CreateUnitPage() {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = "unit-create-form";

  const [loadingUnits, setLoadingUnits] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  const [formData, setFormData] = useState<any>({
    title: "",
    symbol: "",
    baseUnitId: null,
    conversionFactor: 1,
    isActive: true,
  });

  const { clearStorage } = useFormPersist(
    "create-unit-draft",
    formData,
    setFormData
  );

  useEffect(() => {
    apiClient
      .get<Unit[]>("/Units")
      .then((res) => setUnits(res.data))
      .catch(() => toast.error("خطا در دریافت واحدها"))
      .finally(() => setLoadingUnits(false));
  }, []);

  const formFields: FieldConfig[] = useMemo(
    () => [
      {
        name: "title",
        label: "عنوان واحد",
        type: "text",
        required: true,
        placeholder: "مثال: کیلوگرم",
        colSpan: 2,
      },
      {
        name: "symbol",
        label: "نماد",
        type: "text",
        required: true,
        placeholder: "مثال: kg",
        colSpan: 1,
      },
      {
        name: "isActive",
        label: "واحد فعال است",
        type: "checkbox",
        colSpan: 1,
      },
      {
        name: "baseUnitId",
        label: "واحد پایه (اختیاری)",
        type: "select",
        options: [
          { label: "--- بدون واحد پایه ---", value: null }, // ⭐ گزینه خالی
          ...units.map((u) => ({ label: u.title, value: u.id })),
        ],
        placeholder: "انتخاب کنید...",
        colSpan: 1,
      },
      {
        name: "conversionFactor",
        label: "ضریب تبدیل",
        type: "number",
        step: 0.001,
        disabled: !formData.baseUnitId,
        colSpan: 1,
      },
    ],
    [units, formData.baseUnitId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        baseUnitId: formData.baseUnitId ? Number(formData.baseUnitId) : null,
        conversionFactor: formData.baseUnitId
          ? 1
          : Number(formData.conversionFactor),
      };

      await apiClient.post("/Units", payload);
      toast.success("واحد با موفقیت ایجاد شد");

      clearStorage();
      closeTab(activeTabId);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" - ")
        : "خطا در ثبت واحد";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title="تعریف واحد جدید"
      isLoading={loadingUnits}
      isSubmitting={submitting}
      onSubmit={handleSubmit}
      onCancel={() => closeTab(activeTabId)}
      formId={FORM_ID}
      submitText="ثبت واحد"
      showActions={true}
    >
      {/* کارت اصلی */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <Ruler className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">
            اطلاعات واحد سنجش
          </h3>
        </div>

        <AutoForm
          fields={formFields}
          data={formData}
          onChange={(name, value) =>
            setFormData((prev: any) => ({ ...prev, [name]: value }))
          }
          loading={submitting}
        />

        {/* راهنما */}
        {formData.baseUnitId && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg text-sm">
            <p className="text-blue-700 dark:text-blue-400">
              <strong>نکته:</strong> اگر واحد پایه انتخاب کنید، این واحد به صورت
              فرعی (تبدیل‌پذیر) خواهد بود.
              <br />
              <span className="text-xs opacity-75">
                مثال: 1 {formData.title || "واحد جدید"} ={" "}
                {formData.conversionFactor}{" "}
                {units.find((u) => u.id == formData.baseUnitId)?.title ||
                  "واحد پایه"}
              </span>
            </p>
          </div>
        )}
      </div>
    </BaseFormLayout>
  );
}
