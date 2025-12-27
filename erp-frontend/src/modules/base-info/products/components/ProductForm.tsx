"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Box,
  Layers,
  Image as ImageIcon,
  Trash2,
  Edit,
  X,
  Download,
} from "lucide-react";

import MasterDetailForm, {
  MasterDetailTab,
} from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

import { useTabs } from "@/providers/TabsProvider";
import apiClient from "@/services/apiClient";
import { Unit } from "@/modules/base-info/units/types";
import {
  ProductConversionList,
  ConversionRowUi,
} from "./ProductConversionList";
import { productService } from "../services/productService";
import { Product } from "../types";
import { handleApiError } from "@/lib/apiErrorHandler";
import { useEnum } from "@/hooks/useEnum";

interface ProductFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Product;
  id?: number;
}

export function ProductForm({ mode, initialData, id }: ProductFormProps) {
  const { closeTab, activeTabId, addTab } = useTabs();

  // استیت‌های لودینگ
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // تشخیص حالت‌ها
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";

  // دریافت لیست نوع تامین (ماژولار)
  const { items: supplyTypes } = useEnum("ProductSupplyType");

  // --- States ---
  // نکته مهم: همه مقادیر انتخابی را رشته می‌گیریم تا با Select سازگار باشد
  const [formData, setFormData] = useState<any>({
    code: "",
    name: "",
    latinName: "",
    descriptions: "",
    isActive: true,
    supplyType: "1", // پیش‌فرض رشته‌ای
    unitId: "",
  });

  const [units, setUnits] = useState<Unit[]>([]);
  const [conversions, setConversions] = useState<ConversionRowUi[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  // مدال تصویر
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 1. بارگذاری اطلاعات
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // الف) لیست واحدها
        const unitsRes = await apiClient.get<Unit[]>("/BaseInfo/Units/lookup");
        setUnits(unitsRes.data);

        // ب) دریافت اطلاعات محصول (اگر جدید نیست)
        if ((isEditMode || isViewMode) && id) {
          let product = initialData;
          if (!product) {
            product = await productService.getById(id);
          }

          if (product) {
            setFormData({
              code: product.code,
              name: product.name,
              latinName: product.latinName || "",
              descriptions: product.descriptions || "",
              // تبدیل به رشته برای بایندینگ صحیح فرم
              unitId: product.unitId ? String(product.unitId) : "",
              supplyType: product.supplyType ? String(product.supplyType) : "1",
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
        handleApiError(error, "خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mode, id, initialData]);

  // 2. هندلر دکمه اصلی (ثبت / ویرایش)
  const handleMainAction = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- اگر در حالت مشاهده هستیم: برو به ویرایش ---
    if (isViewMode) {
      if (id) {
        closeTab(activeTabId); // تب مشاهده بسته شود
        addTab(`ویرایش ${formData.name}`, `/base-info/products/edit/${id}`); // تب ویرایش باز شود
      }
      return;
    }

    // --- اگر در حالت ثبت/ویرایش هستیم: ذخیره کن ---

    // تبدیل رشته به عدد برای ارسال به سرور
    const unitIdInt = Number(formData.unitId);
    const supplyTypeInt = Number(formData.supplyType);

    // ولیدیشن دستی ساده (برای اطمینان)
    if (!unitIdInt) {
      toast.error("لطفا واحد سنجش را انتخاب کنید");
      return;
    }

    setSubmitting(true);
    try {
      // 1. آپلود تصویر
      let finalImagePath = currentImagePath;
      if (selectedFile) {
        try {
          finalImagePath = await productService.uploadImage(selectedFile);
        } catch (error) {
          handleApiError(error, "خطا در آپلود تصویر");
          setSubmitting(false);
          return;
        }
      }

      // 2. ساخت آبجکت نهایی (تبدیل به فرمت بک‌اند)
      const payloadCommon = {
        code: formData.code,
        name: formData.name,
        latinName: formData.latinName,
        descriptions: formData.descriptions,
        unitId: unitIdInt,
        supplyType: supplyTypeInt,
        imagePath: finalImagePath || null,
        isActive: Boolean(formData.isActive),
      };

      if (isCreateMode) {
        const createPayload = {
          ...payloadCommon,
          conversions: conversions
            .filter((c) => c.alternativeUnitId && Number(c.factor) > 0)
            .map((c) => ({
              alternativeUnitId: Number(c.alternativeUnitId),
              factor: Number(c.factor),
            })),
        };
        await productService.create(createPayload);
        toast.success("محصول با موفقیت ایجاد شد");
      } else {
        const updatePayload = {
          id: id!,
          ...payloadCommon,
          rowVersion: initialData?.rowVersion,
          conversions: conversions.map((c) => ({
            id: c.id && c.id > 0 ? c.id : null,
            alternativeUnitId: Number(c.alternativeUnitId),
            factor: Number(c.factor),
          })),
        };
        await productService.update(updatePayload);
        toast.success("اطلاعات با موفقیت بروزرسانی شد");
      }

      // بستن تب بعد از موفقیت
      closeTab(activeTabId);
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. هندلر دکمه انصراف
  const handleCancel = () => {
    // اگر در حال ویرایش هستیم، به جای بستن تب، به حالت مشاهده برگردیم
    if (isEditMode && id) {
      closeTab(activeTabId);
      addTab(`مشاهده ${formData.name}`, `/base-info/products/view/${id}`);
    } else {
      // در حالت ایجاد، فقط تب را ببند
      closeTab(activeTabId);
    }
  };

  // 4. هندلر تغییر فرم
  const handleFormChange = (name: string, value: any) => {
    if (isViewMode) return;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // 5. هندلر دانلود تصویر
  const handleDownloadImage = async () => {
    if (!currentImagePath) return;
    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}${currentImagePath}`;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `product-${formData.code}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("خطا در دانلود تصویر");
    }
  };

  const handleDeleteImage = () => {
    setCurrentImagePath(null);
    setFormData((prev: any) => ({ ...prev, imagePath: null }));
  };

  // --- تنظیمات فیلدها (AutoForm) ---
  const generalFields: FieldConfig[] = [
    {
      name: "code",
      label: "کد کالا",
      type: "text",
      required: true,
      colSpan: 1,
      disabled: isViewMode,
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
      // نکته: value ها حتما رشته باشند
      options:
        supplyTypes.length > 0
          ? supplyTypes.map((st) => ({ label: st.title, value: String(st.id) }))
          : [
              { label: "خریدنی", value: "1" },
              { label: "تولیدی", value: "2" },
              { label: "خدمات", value: "3" },
            ],
      colSpan: 1,
      disabled: isViewMode,
      required: true,
    },
    {
      name: "unitId",
      label: "واحد سنجش اصلی",
      type: "select",
      required: true,
      options: units.map((u) => ({ label: u.title, value: String(u.id) })),
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

  // --- تب‌ها ---
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
          readOnly={isViewMode}
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
              <div
                className={`relative group w-48 h-48 border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  isViewMode ? "cursor-zoom-in" : ""
                }`}
                onClick={() => isViewMode && setIsImageModalOpen(true)}
              >
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${currentImagePath}`}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                {!isViewMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage();
                      }}
                      className="gap-2"
                    >
                      <Trash2 size={16} /> حذف
                    </Button>
                  </div>
                )}
              </div>
              {isViewMode && (
                <p className="text-xs text-muted-foreground mt-1">
                  برای بزرگنمایی کلیک کنید
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
              <span>تصویری وجود ندارد</span>
            </div>
          )}

          {!isViewMode && (
            <div className="w-full md:w-1/2">
              <Label className="mb-2 block">بارگذاری تصویر جدید</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </div>
      ),
    },
  ];

  let formTitle = "";
  if (isCreateMode) formTitle = "تعریف محصول جدید";
  else if (isEditMode) formTitle = `ویرایش محصول: ${formData.name || ""}`;
  else formTitle = `مشاهده محصول: ${formData.name || ""}`;

  return (
    <>
      <MasterDetailForm
        title={formTitle}
        headerContent={
          isEditMode || isViewMode ? (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                کد:{" "}
                <span className="font-mono text-foreground font-bold">
                  {formData.code}
                </span>
              </span>
              <span className="w-px h-4 bg-border"></span>
              <span>
                وضعیت:{" "}
                <span
                  className={
                    formData.isActive ? "text-emerald-600" : "text-red-600"
                  }
                >
                  {formData.isActive ? "فعال" : "غیرفعال"}
                </span>
              </span>
            </div>
          ) : null
        }
        tabs={tabs}
        isLoading={loading}
        submitting={submitting}
        // --- دکمه‌های اصلی فرم ---
        // در همه حالت‌ها دکمه داریم، فقط متنش عوض میشه
        onSubmit={handleMainAction}
        submitText={isViewMode ? "ویرایش اطلاعات" : "ثبت تغییرات"}
        // دکمه انصراف: در حالت مشاهده نباید باشد
        onCancel={isViewMode ? undefined : handleCancel}
      />

      {/* --- مدال تصویر (Popup) --- */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-zinc-800 focus:outline-none">
          <div className="relative flex items-center justify-center h-[80vh]">
            {/* هدر مدال: دکمه‌ها */}
            <div className="absolute top-4 right-4 left-4 z-50 flex items-center justify-between pointer-events-none">
              {/* سمت راست: دکمه بستن (RTL - در فرانت معمولا راست میشه شروع) */}
              {/* چون direction: rtl است، start میشه راست */}
              <div className="pointer-events-auto">
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-10 w-10 opacity-90 hover:opacity-100 shadow-md"
                  >
                    <X size={20} />
                  </Button>
                </DialogClose>
              </div>

              {/* سمت چپ: دکمه دانلود */}
              <div className="pointer-events-auto">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleDownloadImage}
                  className="rounded-full bg-white/20 hover:bg-white/30 text-white border-none h-10 w-10 backdrop-blur-sm"
                  title="دانلود تصویر"
                >
                  <Download size={20} />
                </Button>
              </div>
            </div>

            {/* تصویر */}
            {currentImagePath && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${currentImagePath}`}
                alt={formData.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
