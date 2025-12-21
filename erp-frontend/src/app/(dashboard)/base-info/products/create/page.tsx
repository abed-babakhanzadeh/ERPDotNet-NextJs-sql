"use client";

import { useState, useEffect, useMemo } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";
import {
  ArrowLeftRight,
  Loader2,
  Save,
  Trash2,
  X,
  Package,
  Plus,
} from "lucide-react";
import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { useTabs } from "@/providers/TabsProvider";
import { useFormPersist } from "@/hooks/useFormPersist";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CreateProductPage() {
  const { closeTab, activeTabId } = useTabs();
  const FORM_ID = "product-create-form";
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  const [formData, setFormData] = useState<any>({
    code: "",
    name: "",
    descriptions: "",
    unitId: null,
    supplyType: 1,
    isActive: true,
  });

  const [conversions, setConversions] = useState<any[]>([]);

  const { clearStorage } = useFormPersist(
    "create-product-draft",
    formData,
    setFormData
  );

  // دریافت لیست واحدها برای کومبو
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data } = await apiClient.get("/BaseInfo/Units/lookup");
        setUnits(data);
      } catch (error) {
        console.error("Error fetching units:", error);
      } finally {
        // اصلاح شد: استفاده از setLoadingUnits به جای setLoadingLookups
        setLoadingUnits(false);
      }
    };

    fetchUnits();
  }, []);

  const formFields: FieldConfig[] = useMemo(
    () => [
      {
        name: "file",
        label: "تصویر محصول",
        type: "file",
        colSpan: 1,
        accept: "image/png, image/jpeg",
      },
      {
        name: "code",
        label: "کد کالا",
        type: "text",
        required: true,
        colSpan: 1,
      },
      {
        name: "name",
        label: "نام کالا",
        type: "text",
        required: true,
        colSpan: 2,
      },
      {
        name: "latinName",
        label: "نام لاتين کالا",
        type: "text",
        required: true,
        colSpan: 2,
      },
      {
        name: "unitId",
        label: "واحد سنجش اصلی",
        type: "select",
        required: true,
        options: units.map((u) => ({ label: u.title, value: u.id })),
      },
      {
        name: "supplyType",
        label: "نوع تامین",
        type: "select",
        options: [
          { label: "خریدنی", value: 1 },
          { label: "تولیدی", value: 2 },
          { label: "خدمات", value: 3 },
        ],
      },
      {
        name: "descriptions",
        label: "توضیحات",
        type: "textarea",
        colSpan: 2,
      },
    ],
    [units]
  );

  const addConversionRow = () =>
    setConversions([...conversions, { alternativeUnitId: "", factor: 1 }]);

  const removeConversionRow = (index: number) => {
    const n = [...conversions];
    n.splice(index, 1);
    setConversions(n);
  };

  const updateConversionRow = (index: number, f: string, v: any) => {
    const n = [...conversions];
    n[index] = { ...n[index], [f]: v };
    setConversions(n);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imagePath = null;

      if (formData.file && formData.file instanceof File) {
        const uploadData = new FormData();
        uploadData.append("file", formData.file);

        try {
          const uploadRes = await apiClient.post("/Upload", uploadData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          imagePath = uploadRes.data.path;
        } catch (uploadError) {
          console.error(uploadError);
          toast.error("خطا در آپلود عکس");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        unitId: Number(formData.unitId),
        supplyType: Number(formData.supplyType),
        imagePath: imagePath,
        file: undefined,
        conversions: conversions
          .filter((c) => c.alternativeUnitId && c.factor > 0)
          .map((c) => ({
            alternativeUnitId: Number(c.alternativeUnitId),
            factor: Number(c.factor),
          })),
      };

      await apiClient.post("/BaseInfo/Products", payload);
      toast.success("کالا با موفقیت ایجاد شد");

      clearStorage();
      closeTab(activeTabId);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" - ")
        : "خطا در ثبت کالا";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title="تعریف کالای جدید"
      isLoading={loadingUnits}
      onSubmit={handleSubmit}
      formId={FORM_ID}
      isSubmitting={submitting}
    >
      {/* کارت اصلی اطلاعات */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">
            اطلاعات اصلی کالا
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
      </div>

      {/* بخش تبدیل واحدها */}
      <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              واحدهای فرعی
            </h3>
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={addConversionRow}
                  size="sm"
                  className="h-8 gap-2 bg-gradient-to-l from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-sm"
                >
                  <Plus size={14} />
                  <span className="text-xs">افزودن واحد</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>افزودن واحد فرعی جدید</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          {conversions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>هنوز واحد فرعی تعریف نشده است</p>
            </div>
          ) : (
            conversions.map((row, index) => (
              <div
                key={index}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-gradient-to-l from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30 hover:border-orange-200 dark:hover:border-orange-800/50 transition-colors"
              >
                <select
                  className="flex-1 min-w-[120px] h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all"
                  value={row.alternativeUnitId}
                  onChange={(e) =>
                    updateConversionRow(
                      index,
                      "alternativeUnitId",
                      e.target.value
                    )
                  }
                >
                  <option value="">انتخاب واحد...</option>
                  {units
                    .filter((u) => u.id != formData.unitId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.title}
                      </option>
                    ))}
                </select>

                <span className="text-xs text-slate-400 font-bold">=</span>

                <input
                  type="number"
                  step="0.001"
                  placeholder="ضریب"
                  className="w-24 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-center text-sm font-semibold focus:ring-2 focus:ring-orange-500/20 transition-all"
                  value={row.factor}
                  onChange={(e) =>
                    updateConversionRow(index, "factor", Number(e.target.value))
                  }
                />

                <span className="text-xs text-slate-500 min-w-[60px] font-medium">
                  {units.find((u) => u.id == formData.unitId)?.title ||
                    "واحد اصلی"}
                </span>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeConversionRow(index)}
                        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto sm:ml-0"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>حذف این واحد</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))
          )}
        </div>
      </div>
    </BaseFormLayout>
  );
}
// نکته مهم: آن تابع ساختگی که احتمالا در پایین فایل ایجاد شده را پاک کنید:
/* function setLoadingLookups(arg0: boolean) {
  throw new Error("Function not implemented.");
}
*/
