"use client";

import { useState, useEffect, use, useMemo } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";
import { Product } from "@/types/product";
import {
  ArrowLeftRight,
  Trash2,
  Edit,
  Eye,
  ZoomIn,
  Loader2,
  Save,
  X,
} from "lucide-react";
import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { useTabs } from "@/providers/TabsProvider";
import { useFormPersist } from "@/hooks/useFormPersist";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import { Button } from "@/components/ui/button";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { useSearchParams } from "next/navigation"; // اضافه شده

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailsPage({ params }: PageProps) {
  const { closeTab, activeTabId } = useTabs();
  const { id } = use(params);
  const searchParams = useSearchParams(); // اضافه شده برای دریافت کوئری
  const FORM_ID = "product-edit-form";

  // --- States ---
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // بررسی پارامتر mode=edit در URL برای تعیین وضعیت اولیه
  const [isEditing, setIsEditing] = useState(
    searchParams.get("mode") === "edit"
  );
  const [showImageModal, setShowImageModal] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<any>({
    code: "",
    name: "",
    latinName: "",
    descriptions: "",
    unitId: "",
    supplyType: 1,
    isActive: true,
    file: null,
  });
  const [conversions, setConversions] = useState<any[]>([]);
  const [isImageDeleted, setIsImageDeleted] = useState(false);

  const { clearStorage } = useFormPersist(
    `product-${id}-v1`, // تغییر نام کلید برای خلاص شدن از کش‌های خراب قدیمی
    formData,
    setFormData,
    !loadingData // <--- نکته طلایی: فقط وقتی لودینگ تمام شد، شروع به کش کردن کن
  );

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, unitsRes] = await Promise.all([
          apiClient.get<Product>(`/BaseInfo/Products/${id}`),
          apiClient.get<Unit[]>("/BaseInfo/Units/lookup"),
        ]);
        const prod = productRes.data;
        setProduct(prod);
        setUnits(unitsRes.data);

        setFormData((prev: any) => ({
          ...prev,
          code: prod.code,
          name: prod.name,
          latinName: prod.latinName,
          descriptions: prod.descriptions || "",
          unitId: prod.unitId,
          supplyType: prod.supplyTypeId || prod.supplyType,
          isActive: prod.isActive ?? true,
        }));

        setConversions(
          prod.conversions?.map((c) => ({
            id: c.id,
            alternativeUnitId: c.alternativeUnitId,
            factor: c.factor,
          })) || []
        );
      } catch (error) {
        toast.error("خطا در دریافت اطلاعات");
        closeTab(activeTabId);
      } finally {
        setLoadingData(false);
      }
    };
    if (id) fetchData();
  }, [id, activeTabId, closeTab]);

  // --- Handlers ---
  const toggleEditMode = () => {
    if (isEditing) {
      setIsEditing(false);
      setIsImageDeleted(false);
    } else {
      setIsEditing(true);
    }
  };

  const addConversionRow = () =>
    setConversions([
      ...conversions,
      { id: 0, alternativeUnitId: "", factor: 1 },
    ]);
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
    if (!product) return;
    setSubmitting(true);
    try {
      let finalImagePath: string | null | undefined = product.imagePath;
      if (isImageDeleted) finalImagePath = null;
      if (formData.file) {
        const uploadData = new FormData();
        uploadData.append("file", formData.file);
        const res = await apiClient.post("/Upload", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalImagePath = res.data.path;
      }

      const payload = {
        id: product.id,
        ...formData,
        rowVersion: product.rowVersion,
        unitId: Number(formData.unitId),
        supplyType: Number(formData.supplyType),
        imagePath: finalImagePath,
        file: undefined,
        conversions: conversions
          .filter((c) => c.alternativeUnitId && c.factor > 0)
          .map((c) => ({
            id: c.id || 0,
            alternativeUnitId: Number(c.alternativeUnitId),
            factor: Number(c.factor),
          })),
      };

      await apiClient.put(`/BaseInfo/Products/${product.id}`, payload);
      toast.success("تغییرات ذخیره شد");

      clearStorage();

      setProduct({
        ...product,
        ...payload,
        imagePath: finalImagePath || product.imagePath,
      });
      setIsEditing(false);
      setIsImageDeleted(false);
      setFormData((prev: any) => ({ ...prev, file: null }));
    } catch (error: any) {
      toast.error("خطا در ذخیره سازی");
    } finally {
      setSubmitting(false);
    }
  };

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5249";

  // --- Fields ---
  const formFields: FieldConfig[] = useMemo(
    () => [
      {
        name: "file",
        label: "تغییر تصویر",
        type: "file",
        colSpan: 1,
        accept: "image/*",
        disabled: !isEditing,
      },
      {
        name: "isActive",
        label: "کالا فعال است",
        type: "checkbox",
        disabled: !isEditing,
      },
      {
        name: "code",
        label: "کد کالا",
        type: "text",
        required: true,
        colSpan: 1,
        disabled: !isEditing,
      },
      {
        name: "name",
        label: "نام کالا",
        type: "text",
        required: true,
        colSpan: 2,
        disabled: !isEditing,
      },
      {
        name: "latinName",
        label: "نام لاتين کالا",
        type: "text",
        required: true,
        colSpan: 2,
        disabled: !isEditing,
      },
      {
        name: "unitId",
        label: "واحد سنجش",
        type: "select",
        required: true,
        disabled: !isEditing,
        options: units.map((u) => ({ label: u.title, value: u.id })),
      },
      {
        name: "supplyType",
        label: "نوع تامین",
        type: "select",
        disabled: !isEditing,
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
        disabled: !isEditing,
      },
    ],
    [units, isEditing]
  );

  const visibleFields = isEditing
    ? formFields
    : formFields.filter((f) => f.name !== "file");

  return (
    <BaseFormLayout
      title={
        isEditing
          ? `ویرایش کالا: ${product?.name}`
          : `جزئیات کالا: ${product?.name || "..."}`
      }
      isLoading={loadingData}
      onSubmit={isEditing ? handleSubmit : undefined}
      formId={FORM_ID}
      onCancel={isEditing ? toggleEditMode : undefined}
      headerActions={
        !loadingData && !isEditing ? (
          // فقط وقتی در حالت مشاهده هستیم دکمه ویرایش را نشان بده
          <Button
            onClick={toggleEditMode}
            variant="outline"
            className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 h-9"
          >
            <Edit size={16} />
            <span className="hidden sm:inline">ویرایش اطلاعات</span>
            <span className="sm:hidden">ویرایش</span>
          </Button>
        ) : undefined // در حالت ویرایش هیچی پاس نده تا خود فرم دکمه‌های پیش‌فرض را بسازد
      }
    >
      {/* اضافه کردن کلاس‌های Tailwind برای اورراید کردن کرسر پیش‌فرض disabled 
        این کلاس‌ها روی تمام inputها و selectهای داخل این دیو اعمال می‌شوند
      */}
      <div className="bg-card border rounded-lg p-6 shadow-sm [&_input:disabled]:cursor-default [&_textarea:disabled]:cursor-default [&_select:disabled]:cursor-default [&_input:disabled]:opacity-80 [&_textarea:disabled]:opacity-80 [&_select:disabled]:opacity-80">
        {product?.imagePath && !isImageDeleted && (
          <div className="mb-6 flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div
              className="relative group cursor-zoom-in"
              onClick={() => setShowImageModal(true)}
            >
              <div className="w-24 h-24 rounded overflow-hidden border bg-white shadow-sm">
                <img
                  src={`${BACKEND_URL}${product.imagePath}`}
                  alt="Current"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded">
                <ZoomIn className="text-white" size={24} />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">تصویر محصول</p>
                <p className="text-xs opacity-70">
                  برای بزرگنمایی روی تصویر کلیک کنید.
                </p>
              </div>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs w-fit gap-1"
                  onClick={() => setIsImageDeleted(true)}
                  type="button"
                >
                  <Trash2 size={12} /> حذف تصویر
                </Button>
              )}
            </div>
          </div>
        )}

        {isImageDeleted && isEditing && (
          <div className="mb-6 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm flex items-center justify-between">
            <span>تصویر حذف خواهد شد.</span>
            <button
              type="button"
              onClick={() => setIsImageDeleted(false)}
              className="underline text-xs"
            >
              بازگردانی
            </button>
          </div>
        )}

        <AutoForm
          fields={visibleFields}
          data={formData}
          onChange={(name, value) =>
            setFormData((prev: any) => ({ ...prev, [name]: value }))
          }
          loading={submitting}
        />
      </div>

      <div className="bg-card border rounded-lg p-4 mt-4 shadow-sm relative [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default [&_input:disabled]:opacity-80 [&_select:disabled]:opacity-80">
        {!isEditing && (
          // حذف cursor-default از اینجا چون می‌خواهیم رفتار طبیعی داشته باشد و فقط جلوی کلیک گرفته شود
          <div className="absolute inset-0 z-10 bg-transparent" />
        )}

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-orange-500" />
            واحدهای فرعی
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={addConversionRow}
              className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition"
            >
              + افزودن واحد
            </button>
          )}
        </div>

        <div className="space-y-3">
          {conversions.map((row, index) => (
            <div
              key={index}
              className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-muted/30 p-3 rounded-lg border"
            >
              <select
                disabled={!isEditing}
                className="flex-1 min-w-[120px] h-9 rounded-md border border-input bg-background px-3 text-sm"
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
              <span className="text-xs text-muted-foreground">=</span>
              <input
                disabled={!isEditing}
                type="number"
                className="w-24 h-9 rounded-md border border-input bg-background px-3 text-center text-sm font-semibold"
                value={row.factor}
                onChange={(e) =>
                  updateConversionRow(index, "factor", Number(e.target.value))
                }
              />
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {units.find((u) => u.id == formData.unitId)?.title ||
                  "واحد اصلی"}
              </span>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => removeConversionRow(index)}
                  className="h-9 w-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md transition ml-auto sm:ml-0"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {conversions.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              بدون واحد فرعی
            </div>
          )}
        </div>
      </div>

      {product?.imagePath && (
        <ImageViewerModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={`${BACKEND_URL}${product.imagePath}`}
          altText={product.name}
        />
      )}
    </BaseFormLayout>
  );
}
