"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Box, Layers, Image as ImageIcon, Trash2 } from "lucide-react";

import MasterDetailForm, {
  MasterDetailTab,
} from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useTabs } from "@/providers/TabsProvider";
import apiClient from "@/services/apiClient";
import { Unit } from "@/modules/base-info/units/types";
import {
  ProductConversionList,
  ConversionRowUi,
} from "./ProductConversionList";
import { productService } from "../services/productService";
import { Product, ProductSupplyType } from "../types";

interface ProductFormProps {
  mode: "create" | "edit" | "view"; // <--- اضافه شدن view
  initialData?: Product;
  id?: number;
}

export function ProductForm({ mode, initialData, id }: ProductFormProps) {
  const { closeTab, activeTabId } = useTabs();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // تشخیص حالت مشاهده
  const isViewMode = mode === "view";

  const [formData, setFormData] = useState<any>({
    isActive: true,
    supplyType: ProductSupplyType.Buy,
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [conversions, setConversions] = useState<ConversionRowUi[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const unitsRes = await apiClient.get<Unit[]>("/BaseInfo/Units/lookup");
        setUnits(unitsRes.data);

        if ((mode === "edit" || mode === "view") && id) {
          // <--- پشتیبانی از view
          let product = initialData;
          if (!product) {
            product = await productService.getById(id);
          }

          if (product) {
            setFormData({
              code: product.code,
              name: product.name,
              latinName: product.latinName,
              descriptions: product.descriptions,
              unitId: product.unitId,
              supplyType: product.supplyType,
              isActive: product.isActive,
            });

            setCurrentImagePath(product.imagePath || null);

            if (product.conversions) {
              setConversions(
                product.conversions.map((c) => ({
                  id: c.id,
                  alternativeUnitId: c.alternativeUnitId,
                  factor: c.factor,
                }))
              );
            }
          }
        }
      } catch (error) {
        toast.error("خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mode, id, initialData]);

  // تعریف فیلدها با اعمال شرط غیرفعال بودن در حالت مشاهده
  const generalFields: FieldConfig[] = [
    {
      name: "code",
      label: "کد کالا",
      type: "text",
      required: true,
      colSpan: 1,
      placeholder: "کد را وارد کنید",
      disabled: isViewMode, // <--- غیرفعال در مشاهده
    },
    {
      name: "name",
      label: "نام کالا",
      type: "text",
      required: true,
      colSpan: 2,
      disabled: isViewMode,
    },
    {
      name: "supplyType",
      label: "نوع تامین",
      type: "select",
      options: [
        { label: "خریدنی", value: ProductSupplyType.Buy },
        { label: "تولیدی", value: ProductSupplyType.Produce },
        { label: "خدمات", value: ProductSupplyType.Service },
      ],
      colSpan: 1,
      disabled: isViewMode,
    },
    {
      name: "unitId",
      label: "واحد سنجش اصلی",
      type: "select",
      required: true,
      options: units.map((u) => ({ label: u.title, value: u.id })),
      colSpan: 1,
      disabled: isViewMode,
    },
    {
      name: "latinName",
      label: "نام لاتین",
      type: "text",
      colSpan: 1,
      disabled: isViewMode,
    },
    {
      name: "isActive",
      label: "فعال",
      type: "checkbox",
      colSpan: 1,
      disabled: isViewMode,
    },
    {
      name: "descriptions",
      label: "توضیحات",
      type: "textarea",
      colSpan: 3,
      disabled: isViewMode,
    },
  ];

  const handleFormChange = (name: string, value: any) => {
    if (isViewMode) return; // جلوگیری از تغییر در کد
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleDeleteImage = () => {
    setCurrentImagePath(null);
    setFormData((prev: any) => ({ ...prev, imagePath: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return; // اطمینان حاصل کنیم

    setSubmitting(true);
    try {
      let finalImagePath = currentImagePath;
      if (selectedFile) {
        try {
          finalImagePath = await productService.uploadImage(selectedFile);
        } catch {
          toast.error("خطا در آپلود تصویر");
          setSubmitting(false);
          return;
        }
      }

      const validConversions = conversions
        .filter((c) => c.alternativeUnitId && Number(c.factor) > 0)
        .map((c) => ({
          id: c.id || null,
          alternativeUnitId: Number(c.alternativeUnitId),
          factor: Number(c.factor),
        }));

      const payload = {
        ...formData,
        unitId: Number(formData.unitId),
        supplyType: Number(formData.supplyType),
        imagePath: finalImagePath,
        conversions: validConversions,
      };

      if (mode === "create") {
        await productService.create(payload);
        toast.success("محصول با موفقیت ایجاد شد");
      } else {
        await productService.update({
          id: id!,
          ...payload,
          rowVersion: initialData?.rowVersion,
        });
        toast.success("تغییرات با موفقیت ذخیره شد");
      }
      closeTab(activeTabId);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "خطا در عملیات";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: MasterDetailTab[] = [
    {
      key: "general",
      label: "اطلاعات پایه",
      icon: Box,
      content: (
        <div className="p-1">
          <AutoForm
            fields={generalFields}
            data={formData}
            onChange={handleFormChange}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          />
        </div>
      ),
    },
    {
      key: "units",
      label: "واحدهای سنجش فرعی",
      icon: Layers,
      content: (
        <ProductConversionList
          conversions={conversions}
          onChange={setConversions}
          units={units}
          mainUnitId={formData.unitId}
          readOnly={isViewMode} // <--- حالت فقط خواندنی
        />
      ),
    },
    {
      key: "images",
      label: "تصاویر",
      icon: ImageIcon,
      content: (
        <div className="bg-card border rounded-lg p-6 space-y-6">
          {currentImagePath ? (
            <div className="flex flex-col gap-2 w-fit">
              <Label>تصویر فعلی</Label>
              <div className="relative group w-48 h-48 border rounded-lg overflow-hidden">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${currentImagePath}`}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                {/* مخفی کردن دکمه حذف در حالت مشاهده */}
                {!isViewMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteImage}
                      className="gap-2"
                    >
                      <Trash2 size={16} /> حذف تصویر
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              تصویری بارگذاری نشده است.
            </div>
          )}

          {/* مخفی کردن اینپوت فایل در حالت مشاهده */}
          {!isViewMode && (
            <div className="w-full md:w-1/2">
              <Label className="mb-2 block">انتخاب تصویر جدید</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                فرمت‌های مجاز: JPG, PNG. حداکثر حجم: 2MB
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  let title = "";
  if (mode === "create") title = "تعریف محصول جدید";
  else if (mode === "edit") title = `ویرایش محصول: ${formData.name || ""}`;
  else title = `مشاهده محصول: ${formData.name || ""}`; // تایتل حالت مشاهده

  return (
    <MasterDetailForm
      title={title}
      headerContent={
        mode === "edit" || mode === "view" ? (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>کد: {formData.code}</span>
            <span className="w-px h-4 bg-border"></span>
            <span>وضعیت: {formData.isActive ? "فعال" : "غیرفعال"}</span>
          </div>
        ) : null
      }
      tabs={tabs}
      isLoading={loading}
      submitting={submitting}
      // اگر در حالت مشاهده باشیم، onSubmit را نال می‌فرستیم تا دکمه ثبت مخفی شود
      onSubmit={isViewMode ? undefined : handleSubmit}
      onCancel={() => closeTab(activeTabId)}
    />
  );
}
