"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Box,
  Save,
  LayoutGrid,
  Layers,
  Warehouse,
  Tag,
  Pencil,
  ImageIcon,
} from "lucide-react";

import apiClient from "@/services/apiClient";
import inventoryService from "@/services/inventoryService";
import { Unit } from "@/types/baseInfo";
import { Product } from "@/types/product";
import { InventoryItemProfileDto } from "@/types/inventory";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TableLookupCombobox } from "@/components/ui/TableLookupCombobox";
import { Textarea } from "@/components/ui/textarea";

import InventorySettingsTab from "@/components/inventory/product/InventorySettingsTab";
import ProductBatchesTab from "@/components/inventory/product/ProductBatchesTab";
import ProductUnitsTab from "./ProductUnitsTab";
import ProductImageTab from "./ProductImageTab";

const productSchema = z.object({
  code: z.string().min(1, "کد کالا الزامی است"),
  name: z.string().min(1, "نام کالا الزامی است"),
  latinName: z.string().optional(),
  unitId: z.coerce.number().min(1, "واحد سنجش اصلی الزامی است"),
  supplyType: z.coerce.number().default(1),
  productNature: z.coerce.number().default(1),
  productGroupId: z.coerce.number().optional().nullable(),
  descriptions: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  mode: "create" | "edit" | "view";
  productId?: number;
}

export default function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();

  const isView = mode === "view";
  const isCreate = mode === "create";

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [units, setUnits] = useState<Unit[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);

  const [isBatchManaged, setIsBatchManaged] = useState(false);

  // مدیریت تصویر
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteImage, setDeleteImage] = useState(false);

  // نگهداری مسیر تصویر فعلی برای اینکه اگر تغییری نکرد همان را بفرستیم
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: "",
      name: "",
      latinName: "",
      unitId: 0,
      supplyType: 1,
      descriptions: "",
      isActive: true,
    },
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const unitsRes = await apiClient.get("/BaseInfo/Units/lookup");
        setUnits(unitsRes.data);

        if (!isCreate && productId) {
          const productRes = await apiClient.get(
            `/BaseInfo/Products/${productId}`,
          );
          const prod = productRes.data;

          const profile = await inventoryService.getProductProfile(productId);
          if (profile) {
            setIsBatchManaged(profile.isBatchManaged);
          }

          form.reset({
            code: prod.code ?? "",
            name: prod.name ?? "",
            latinName: prod.latinName ?? "",
            unitId: prod.unitId,
            supplyType: prod.supplyTypeId || prod.supplyType,
            descriptions: prod.descriptions ?? "",
            productGroupId: prod.productGroupId,
            isActive: prod.isActive ?? true,
          });

          if (prod.conversions) {
            setConversions(prod.conversions);
          }

          if (prod.imagePath) {
            setCurrentImagePath(prod.imagePath); // ذخیره مسیر فعلی
            setImagePreview(
              `${process.env.NEXT_PUBLIC_API_URL}${prod.imagePath}`,
            );
          }
        }
      } catch (error) {
        toast.error("خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [mode, productId, isCreate, form]);

  const handleProfileUpdate = (profile: InventoryItemProfileDto) => {
    setIsBatchManaged(profile.isBatchManaged);
  };

  const onSubmitGeneral = async (values: ProductFormValues) => {
    setLoading(true);
    try {
      // 1. مدیریت آپلود تصویر (اگر فایلی انتخاب شده باشد)
      let finalImagePath = currentImagePath;

      if (deleteImage) {
        finalImagePath = null;
      }

      if (selectedImage) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedImage);

        try {
          // استفاده از کنترلر آپلود عمومی
          const uploadRes = await apiClient.post("/Upload", uploadFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          finalImagePath = uploadRes.data.path;
        } catch (err) {
          console.error("Upload Error", err);
          toast.error("خطا در آپلود تصویر");
          setLoading(false);
          return;
        }
      }

      // 2. آماده‌سازی داده‌ها به صورت JSON (برای رفع خطای 415)
      const cleanConversions = conversions
        .filter((c) => (c.alternativeUnitId || c.unitId) && c.factor > 0)
        .map((c) => ({
          id: c.id || 0,
          alternativeUnitId: Number(c.alternativeUnitId || c.unitId),
          factor: Number(c.factor),
        }));

      const payload = {
        ...values,
        id: productId ? Number(productId) : 0,
        unitId: Number(values.unitId),
        supplyType: Number(values.supplyType),
        // ارسال مسیر تصویر (رشته) به جای فایل
        imagePath: finalImagePath,
        // در حالت JSON معمولاً لیست conversions را مستقیم می‌فرستیم، نه رشته JSON
        // اما اگر بک‌اند شما string می‌گیرد، باید چک شود.
        // با توجه به page_edit.tsx قبلی، به صورت آرایه آبجکت ارسال می‌شد:
        conversions: cleanConversions,
      };

      // 3. ارسال درخواست
      if (isCreate) {
        const res = await apiClient.post("/BaseInfo/Products", payload);
        toast.success("کالا با موفقیت ایجاد شد");
        window.location.href = `/base-info/products/edit/${res.data}`;
      } else {
        await apiClient.put(`/BaseInfo/Products/${productId}`, payload);
        toast.success("اطلاعات کالا با موفقیت بروزرسانی شد");
        // آپدیت استیت محلی تصویر
        setCurrentImagePath(finalImagePath);
        setDeleteImage(false);
        setSelectedImage(null);
      }
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "خطا در ذخیره اطلاعات";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderActions = () => {
    return (
      <div className="flex items-center gap-2">
        {isView && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={() => router.push(`/base-info/products/edit/${productId}`)}
          >
            <Pencil size={16} /> ویرایش
          </Button>
        )}

        {!isView && (
          <>
            {(activeTab === "general" ||
              activeTab === "units" ||
              activeTab === "image") && (
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmitGeneral)}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin">⌛</div>
                ) : (
                  <Save size={16} />
                )}
                {isCreate ? "ثبت و ادامه" : "ثبت تغییرات"}
              </Button>
            )}

            {activeTab === "inventory" && (
              <label
                htmlFor="submit-inventory-profile"
                className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-9 px-4 gap-2 shadow-sm ${loading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Save size={16} /> ثبت تنظیمات انبار
              </label>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl" className="h-full w-full flex flex-col">
      <BaseFormLayout
        title={
          isCreate
            ? "تعریف کالای جدید"
            : `مدیریت کالا: ${form.getValues("name") || "..."}`
        }
        isLoading={loading}
        headerActions={renderHeaderActions()}
        onSubmit={undefined}
        showActions={false}
      >
        <div className="h-full flex flex-col bg-background w-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            dir="rtl"
            className="w-full flex-1 flex flex-col"
          >
            <div className="border-b bg-background px-4">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                <TabsTrigger
                  value="general"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 text-sm"
                >
                  <LayoutGrid className="w-4 h-4 ml-2" /> مشخصات اصلی
                </TabsTrigger>

                <TabsTrigger
                  value="units"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 text-sm"
                >
                  <Layers className="w-4 h-4 ml-2" /> واحدها و ضرایب
                </TabsTrigger>

                <TabsTrigger
                  value="image"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 text-sm"
                >
                  <ImageIcon className="w-4 h-4 ml-2" /> تصویر
                </TabsTrigger>

                <TabsTrigger
                  value="inventory"
                  disabled={isCreate}
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-4 text-sm"
                >
                  <Warehouse className="w-4 h-4 ml-2" /> تنظیمات انبار
                </TabsTrigger>

                {isBatchManaged && !isCreate && (
                  <TabsTrigger
                    value="batches"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-4 text-sm animate-in fade-in zoom-in duration-300"
                  >
                    <Tag className="w-4 h-4 ml-2" /> مدیریت بچ‌ها
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20 w-full">
              <TabsContent value="general" className="mt-0 h-full w-full">
                <div className="w-full bg-card border rounded-lg p-6 shadow-sm">
                  <Form {...form}>
                    <form
                      id="product-general-form"
                      onSubmit={form.handleSubmit(onSubmitGeneral)}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>کد کالا</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  disabled={isView}
                                  className="text-right font-mono"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>نام کالا (فارسی)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  disabled={isView}
                                  className="text-right"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-x-reverse rounded-md border p-3 shadow-sm h-10 mt-8 bg-white">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isView}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none mr-2">
                                <FormLabel className="cursor-pointer">
                                  کالا فعال است
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unitId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>واحد سنجش اصلی</FormLabel>
                              <FormControl>
                                <TableLookupCombobox
                                  value={field.value}
                                  onValueChange={(val) =>
                                    field.onChange(Number(val))
                                  }
                                  items={units}
                                  columns={[
                                    { key: "title", label: "عنوان واحد" },
                                  ]}
                                  displayFields={["title"]}
                                  placeholder="انتخاب واحد..."
                                  disabled={isView}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="latinName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نام لاتین</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  disabled={isView}
                                  className="text-left"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="supplyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نوع تامین</FormLabel>
                              <div className="flex gap-2">
                                {[
                                  { label: "خریدنی", value: 1 },
                                  { label: "تولیدی", value: 2 },
                                  { label: "خدمات", value: 3 },
                                ].map((opt) => (
                                  <div
                                    key={opt.value}
                                    onClick={() =>
                                      !isView && field.onChange(opt.value)
                                    }
                                    className={`
                                                    cursor-pointer px-3 py-2 rounded-md border text-xs flex-1 text-center transition-colors
                                                    ${
                                                      field.value === opt.value
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-background hover:bg-muted"
                                                    }
                                                    ${isView ? "cursor-default opacity-80" : ""}
                                                `}
                                  >
                                    {opt.label}
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="descriptions"
                          render={({ field }) => (
                            <FormItem className="col-span-full">
                              <FormLabel>توضیحات</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value ?? ""}
                                  disabled={isView}
                                  rows={3}
                                  className="text-right"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                </div>
              </TabsContent>

              <TabsContent value="units" className="mt-0 h-full w-full">
                <div className="w-full bg-card border rounded-lg p-6 shadow-sm">
                  <ProductUnitsTab
                    units={units}
                    mainUnitId={form.watch("unitId")}
                    conversions={conversions}
                    setConversions={setConversions}
                    isViewMode={isView}
                  />
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0 h-full w-full">
                <div className="w-full bg-card border rounded-lg p-6 shadow-sm">
                  <ProductImageTab
                    imagePreview={imagePreview}
                    onImageSelect={(file) => {
                      setSelectedImage(file);
                      setImagePreview(URL.createObjectURL(file));
                      setDeleteImage(false);
                    }}
                    onImageRemove={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      setDeleteImage(true);
                    }}
                    isViewMode={isView}
                  />
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="mt-0 h-full w-full">
                <div className="w-full">
                  {productId && (
                    <InventorySettingsTab
                      productId={productId}
                      units={units}
                      isViewMode={isView}
                      onProfileUpdate={handleProfileUpdate}
                    />
                  )}
                </div>
              </TabsContent>

              {/* محتوای تب بچ فقط اگر فعال باشد رندر شود */}
              {isBatchManaged && !isCreate && (
                <TabsContent value="batches" className="mt-0 h-full w-full">
                  <div className="w-full bg-card border rounded-lg p-6 shadow-sm">
                    {productId && (
                      <ProductBatchesTab
                        productId={productId}
                        isViewMode={isView}
                      />
                    )}
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </BaseFormLayout>
    </div>
  );
}
