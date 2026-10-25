"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, List, Warehouse } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Button } from "@/components/ui/button";
import LocationTree from "@/components/inventory/LocationTree";
import { Form } from "@/components/ui/form";
import { FormSection } from "@/components/form/FormSection";
import {
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
} from "@/components/form/fields";

import inventoryService from "@/services/inventoryService";
import { WarehouseDto } from "@/types/inventory";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";

// 1. اسکیمای به‌روز شده طبق DefineWarehouseCommand در بک‌اند
const warehouseSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  code: z.string().min(1, "کد الزامی است"),
  // فیلد نوع انبار (Enum) که عدد ارسال می‌شود
  type: z.coerce.number().min(1, "انتخاب نوع انبار الزامی است"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

// تعریف اینترفیس برای آیتم‌های کمبو
interface OptionDto {
  value: number;
  label: string;
}

export default function WarehousePage() {
  const router = useRouter();
  const params = useParams();
  const { mutate } = useSWRConfig();
  const FORM_ID = "warehouse-form";

  const mode = params.mode as "create" | "edit" | "view";
  const id = params.id?.[0];

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WarehouseDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت برای نگهداری لیست انواع انبار
  const [warehouseTypes, setWarehouseTypes] = useState<OptionDto[]>([]);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      title: "",
      code: "",
      type: 1, // مقدار پیش‌فرض (مثلاً فیزیکی)
      address: "",
      isActive: true,
    },
  });

  // دریافت لیست انواع انبار در ابتدای لود صفحه
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await inventoryService.getWarehouseTypes();
        setWarehouseTypes(types);
      } catch (error) {
        handleApiError(error, "خطا در دریافت انواع انبار");
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      loadData(Number(id));
    }
  }, [mode, id]);

  const loadData = async (warehouseId: number) => {
    setLoading(true);
    try {
      // این متد WarehouseDetailsDto برمی‌گرداند که شامل فیلدهای درست است
      const result = await inventoryService.getWarehouseById(warehouseId);
      setData(result);
      form.reset({
        title: result.title,
        code: result.code,
        // توجه: در متد getWarehouseById مقدار type به صورت عدد (int) برمی‌گردد
        type: result.type,
        address: result.address || "",
        isActive: result.isActive,
      });
    } catch (error) {
      handleApiError(error, "خطا در دریافت اطلاعات انبار");
      router.push("/inventory/warehouses");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        // اصلاح شد: استفاده از متد defineWarehouse به جای createWarehouse
        // همچنین برای اطمینان از تطابق تایپ، values را پاس می‌دهیم (تایپ نامبر با enum سازگار است)
        await inventoryService.defineWarehouse(values as any);
        toast.success("انبار با موفقیت ایجاد شد");
      } else {
        await inventoryService.updateWarehouse(Number(id), {
          ...values,
          id: Number(id),
          rowVersion: data?.rowVersion || "",
        });
        toast.success("انبار با موفقیت ویرایش شد");
      }

      mutate("/api/inventory/warehouses");
      form.reset(values);
      router.push("/inventory/warehouses");
    } catch (error: any) {
      handleApiError(error, "خطا در عملیات");
      applyFieldErrors(error, (name, e) =>
        form.setError(name as keyof WarehouseFormValues, e),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (mode === "edit") {
      form.reset();
      if (id) loadData(Number(id));
      router.push(`/inventory/warehouses/view/${id}`);
    } else {
      router.push("/inventory/warehouses");
    }
  };

  const isReadOnly = mode === "view";

  return (
    <BaseFormLayout
      title={
        mode === "create"
          ? "تعریف انبار جدید"
          : mode === "edit"
            ? `ویرایش انبار: ${data?.title || ""}`
            : `مشاهده انبار: ${data?.title || ""}`
      }
      isLoading={loading}
      isSubmitting={isSubmitting}
      isDirty={!isReadOnly && form.formState.isDirty}
      formId={FORM_ID}
      onSubmit={!isReadOnly ? form.handleSubmit(onSubmit) : undefined}
      onCancel={handleCancel}
      submitText={mode === "create" ? "ثبت نهایی" : "ذخیره تغییرات"}
      headerActions={
        mode === "view" && (
          <>
            <Button
              onClick={() => router.push(`/inventory/warehouses/edit/${id}`)}
              className="gap-2"
              size="sm"
            >
              <Pencil className="h-4 w-4" />
              ویرایش
            </Button>

            <Button
              onClick={() => router.push("/inventory/warehouses")}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <List className="h-4 w-4" />
              فهرست
            </Button>
          </>
        )
      }
    >
      <Form {...form}>
        <FormSection title="اطلاعات انبار" icon={Warehouse}>
          <TextField
            control={form.control}
            name="title"
            label="عنوان انبار"
            required
            disabled={isReadOnly}
          />
          <TextField
            control={form.control}
            name="code"
            label="کد انبار"
            dir="ltr"
            required
            disabled={isReadOnly}
          />
          <SelectField
            control={form.control}
            name="type"
            label="نوع انبار"
            options={warehouseTypes}
            required
            disabled={isReadOnly}
          />
          <SwitchField
            control={form.control}
            name="isActive"
            label="انبار فعال است"
            description="انبار غیرفعال در اسناد جدید قابل انتخاب نیست"
            disabled={isReadOnly}
            className="self-end"
          />
          <TextareaField
            control={form.control}
            name="address"
            label="آدرس کامل"
            rows={3}
            disabled={isReadOnly}
            className="sm:col-span-full"
          />
        </FormSection>
      </Form>

      {/* === اضافه کردن بخش لوکیشن‌ها === */}
      {mode === "view" && id && (
        <div className="mt-2">
          <LocationTree warehouseId={Number(id)} />
        </div>
      )}
    </BaseFormLayout>
  );
}
