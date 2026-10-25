"use client";

import { useState, useEffect, useMemo, use } from "react";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";
import { Ruler } from "lucide-react";
import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { useTabs } from "@/providers/TabsProvider";
import { useFormPersist } from "@/hooks/useFormPersist";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import { handleApiError } from "@/lib/error-handling";
import { unitService, productService } from "@/services/baseInfoService";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUnitPage({ params }: PageProps) {
  const { closeTab, activeTabId } = useTabs();
  const { id } = use(params);
  const FORM_ID = "unit-edit-form";

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);

  const [formData, setFormData] = useState<any>({
    title: "",
    symbol: "",
    baseUnitId: null,
    conversionFactor: 1,
    isActive: true,
  });

  const { clearStorage } = useFormPersist(
    `unit-edit-${id}`,
    formData,
    setFormData
  );

  // بارگذاری داده‌ها
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedUnit, allUnits] = await Promise.all([
          unitService.getById(Number(id)),
          unitService.lookup(),
        ]);

        setUnit(fetchedUnit);
        setUnits(allUnits);

        setFormData({
          title: fetchedUnit.title,
          symbol: fetchedUnit.symbol,
          baseUnitId: fetchedUnit.baseUnitId || null,
          conversionFactor: fetchedUnit.conversionFactor || 1,
          isActive: fetchedUnit.isActive ?? true,
        });
      } catch (error) {
        handleApiError(error, "خطا در دریافت اطلاعات واحد");
        closeTab(activeTabId);
      } finally {
        setLoadingData(false);
      }
    };

    if (id) fetchData();
  }, [id, activeTabId, closeTab]);

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
          ...units
            .filter((u) => u.id !== Number(id))
            .map((u) => ({ label: u.title, value: u.id })),
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
    [units, formData.baseUnitId, id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setSubmitting(true);

    // دیباگ: لاگ کردن مقادیر قبل از ارسال
    console.log("Form Data before submit:", formData);

    try {
      // تبدیل ایمن baseUnitId به عدد یا نال
      const baseUnitIdValue = formData.baseUnitId
        ? Number(formData.baseUnitId)
        : null;

      const payload = {
        id: unit.id,
        title: formData.title,
        symbol: formData.symbol,
        precision: Number(formData.precision || 0),
        isActive: formData.isActive,

        // ارسال BaseUnitId
        baseUnitId: baseUnitIdValue,

        // اصلاح مهم: وابستگی به baseUnitId را برداشتیم.
        // اگر کاربر عددی وارد کرده، همان را بفرست، در غیر این صورت 1 بفرست.
        conversionFactor: formData.conversionFactor
          ? Number(formData.conversionFactor)
          : 1,

        // اضافه کردن RowVersion برای جلوگیری از خطای احتمالی در آینده
        rowVersion: unit.rowVersion,
      };

      console.log("Payload sent to server:", payload); // این را در کنسول مرورگر چک کنید

      // دقت کنید آدرس BaseInfo داشته باشد
      await unitService.update(unit.id, payload);

      toast.success("واحد با موفقیت ویرایش شد");
      clearStorage();
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, "خطا در ویرایش واحد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title={`ویرایش واحد: ${unit?.title || "..."}`}
      isLoading={loadingData}
      isSubmitting={submitting}
      onSubmit={handleSubmit}
      onCancel={() => closeTab(activeTabId)}
      formId={FORM_ID}
      submitText="ذخیره تغییرات"
      showActions={true}
    >
      {/* کارت اصلی */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Ruler className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base text-foreground">
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
          <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm">
            <p className="text-primary">
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

        {/* هشدار اگر واحد در کالا/قلمها استفاده شده */}
        {unit && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
            <p className="text-warning">
              ⚠️ <strong>توجه:</strong> تغییر واحد پایه یا ضریب تبدیل ممکن است
              بر کالا/قلمهای موجود تاثیر بگذارد.
            </p>
          </div>
        )}
      </div>
    </BaseFormLayout>
  );
}
