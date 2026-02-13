"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Undo2, Pencil, List, Loader2 } from "lucide-react";

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

import inventoryService from "@/services/inventoryService";
import { WarehouseDto } from "@/types/inventory";

const warehouseSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  code: z.string().min(1, "کد الزامی است"),
  manager: z.string().optional(),
  tel: z.string().optional(),
  address: z.string().optional(),
  capacity: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export default function WarehousePage() {
  const router = useRouter();
  const params = useParams();
  const { mutate } = useSWRConfig();

  const mode = params.mode as "create" | "edit" | "view";
  const id = params.id?.[0];

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WarehouseDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      title: "",
      code: "",
      manager: "",
      tel: "",
      address: "",
      capacity: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      loadData(Number(id));
    }
  }, [mode, id]);

  const loadData = async (warehouseId: number) => {
    setLoading(true);
    try {
      const result = await inventoryService.getWarehouseById(warehouseId);
      setData(result);
      form.reset({
        title: result.title,
        code: result.code,
        manager: result.manager || "",
        tel: result.tel || "",
        address: result.address || "",
        capacity: result.capacity || 0,
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
      isLoading={loading} // استفاده از پراپ استاندارد loading
      headerActions={
        <>
          {mode === "view" ? (
            <>
              <Button
                onClick={() => router.push(`/inventory/warehouses/edit/${id}`)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                ویرایش
              </Button>

              <Button
                onClick={() => router.push("/inventory/warehouses")}
                variant="outline"
                className="gap-2"
              >
                <List className="h-4 w-4" />
                فهرست
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                ثبت نهایی
              </Button>

              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSubmitting}
                className="gap-2"
              >
                <Undo2 className="h-4 w-4" />
                انصراف
              </Button>
            </>
          )}
          {/* دکمه تمام صفحه توسط خود BaseFormLayout رندر می‌شود */}
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
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

            <FormField
              control={form.control}
              name="manager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مسئول انبار</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تلفن</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ظرفیت (تعداد پالت/قفسه)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={isReadOnly} />
                  </FormControl>
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

            <div className="col-span-1 md:col-span-2 lg:col-span-3">
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
        </form>
      </Form>
    </BaseFormLayout>
  );
}
