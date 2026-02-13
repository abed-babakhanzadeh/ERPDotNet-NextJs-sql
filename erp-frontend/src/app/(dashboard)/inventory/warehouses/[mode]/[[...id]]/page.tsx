"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, List } from "lucide-react";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import inventoryService from "@/services/inventoryService";
import { WarehouseDto } from "@/types/inventory";

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
        toast.error("خطا در دریافت انواع انبار");
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
      toast.error("خطا در دریافت اطلاعات انبار");
      router.push("/inventory/warehouses");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await inventoryService.createWarehouse(values);
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
      router.push("/inventory/warehouses");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در عملیات");
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
        {/* گرید را تنظیم کردیم تا جای خالی فیلدهای حذف شده پر شود */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان انبار</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>کد انبار</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* فیلد جدید نوع انبار */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع انبار</FormLabel>
                <Select
                  disabled={isReadOnly}
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouseTypes.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value.toString()}
                      >
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8 bg-card">
                <div className="space-y-0.5">
                  <FormLabel>وضعیت انبار</FormLabel>
                  <FormDescription>
                    آیا این انبار فعال و قابل استفاده است؟
                  </FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isReadOnly}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="col-span-1 md:col-span-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>آدرس کامل</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isReadOnly}
                      className="resize-none min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </BaseFormLayout>
  );
}
