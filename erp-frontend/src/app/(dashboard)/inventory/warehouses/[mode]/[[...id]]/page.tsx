"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Box, Edit3 } from "lucide-react";
import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { useTabs } from "@/providers/TabsProvider";
import AutoForm, { FieldConfig, Option } from "@/components/form/AutoForm";
import { Button } from "@/components/ui/button";
import inventoryService from "@/services/inventoryService";

export default function WarehouseFormPage() {
  const { closeTab, activeTabId } = useTabs();
  const params = useParams();

  // استخراج وضعیت (mode) و شناسه (id) از آدرس
  const mode = params.mode as "create" | "edit" | "view";
  const id = params.id?.[0];

  const [currentMode, setCurrentMode] = useState(mode);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [typeOptions, setTypeOptions] = useState<Option[]>([]);
  const [formData, setFormData] = useState<any>({
    title: "",
    code: "",
    type: 1,
    address: "",
    isActive: true,
  });

  useEffect(() => {
    const init = async () => {
      try {
        // ۱. دریافت انواع انبار از بک‌ایند
        const types = await inventoryService.getWarehouseTypes();
        setTypeOptions(types);

        // ۲. اگر حالت ویرایش یا نمایش است، اطلاعات را لود کن
        if (id && currentMode !== "create") {
          const data = await inventoryService.getWarehouseById(id);
          setFormData(data);
        }
      } catch (error) {
        toast.error("خطا در بارگذاری اطلاعات اولیه");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, currentMode]);

  // تنظیمات فیلدها با قابلیت Read-only در حالت View
  const fields: FieldConfig[] = useMemo(
    () => [
      {
        name: "title",
        label: "عنوان انبار",
        type: "text",
        required: true,
        disabled: currentMode === "view",
      },
      {
        name: "code",
        label: "کد انبار",
        type: "text",
        required: true,
        disabled: currentMode === "view",
      },
      {
        name: "type",
        label: "نوع انبار",
        type: "select",
        options: typeOptions,
        disabled: currentMode === "view",
      },
      {
        name: "isActive",
        label: "وضعیت فعال",
        type: "checkbox",
        disabled: currentMode === "view",
      },
      {
        name: "address",
        label: "آدرس",
        type: "textarea",
        colSpan: 2,
        disabled: currentMode === "view",
      },
    ],
    [typeOptions, currentMode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (currentMode === "create") {
        await inventoryService.defineWarehouse(formData);
        toast.success("انبار با موفقیت تعریف شد");
      } else {
        // ۱. تبدیل رشته به عدد برای رفع خطای id
        const numericId = Number(id);
        if (isNaN(numericId)) throw new Error("شناسه نامعتبر است");

        // ۲. ارسال آیدی عددی به سرویس
        await inventoryService.updateWarehouse(numericId, formData);
        toast.success("تغییرات با موفقیت ذخیره شد");
      }

      // ۳. رفع خطای closeTab با ارسال activeTabId
      if (activeTabId) {
        closeTab(activeTabId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.Message || "خطا در انجام عملیات");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title={
        currentMode === "create"
          ? "ایجاد انبار"
          : currentMode === "edit"
            ? "ویرایش انبار"
            : "جزئیات انبار"
      }
      isLoading={loading}
      isSubmitting={submitting}
      onSubmit={handleSubmit}
      submitText={currentMode === "create" ? "ثبت نهایی" : "ذخیره تغییرات"}
      formId="warehouse-form" // اضافه شد برای هماهنگی با دکمه Save در لایوت [cite: 67]
    >
      {/* استفاده از استایل فرم Unit برای ظاهر بهتر  */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Box className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">
            اطلاعات اصلی انبار
          </h3>
        </div>

        <AutoForm
          fields={fields}
          data={formData}
          onChange={(name, value) =>
            setFormData((prev: any) => ({ ...prev, [name]: value }))
          }
          loading={submitting}
        />
      </div>
    </BaseFormLayout>
  );
}
