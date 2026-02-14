"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { LocationDto } from "@/types/inventory";

const locationSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  code: z.string().min(1, "کد الزامی است"),
  parentId: z.string().optional(), // ما در فرم استرینگ نگه می‌داریم و تبدیل می‌کنیم
  isBlocked: z.boolean().default(false),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouseId: number;
  mode: "create" | "edit";
  parentLocation?: LocationDto | null; // برای ایجاد فرزند
  editData?: LocationDto | null; // برای ویرایش
  allLocations?: LocationDto[]; // برای لیست انتخاب والد
}

export default function LocationDialog({
  isOpen,
  onClose,
  onSuccess,
  warehouseId,
  mode,
  parentLocation,
  editData,
  allLocations = [],
}: LocationDialogProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      title: "",
      code: "",
      parentId: "root",
      isBlocked: false,
    },
  });

  const { isSubmitting } = form.formState;

  // پر کردن فرم هنگام باز شدن
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && editData) {
        form.reset({
          title: editData.title,
          code: editData.code,
          parentId: editData.parentId?.toString() || "root",
          isBlocked: editData.isBlocked,
        });
      } else {
        // حالت ایجاد (جدید یا فرزند)
        form.reset({
          title: "",
          code: "",
          parentId: parentLocation?.id.toString() || "root",
          isBlocked: false,
        });
      }
    }
  }, [isOpen, mode, editData, parentLocation, form]);

  // فیلتر کردن لیست والدین مجاز (جلوگیری از انتخاب خود یا فرزندان به عنوان والد در ویرایش)
  const validParents = useMemo(() => {
    if (mode === "create") return allLocations;
    if (!editData) return allLocations;

    // در حالت ویرایش، نباید خود یا فرزندان خود را در لیست والد ببینیم
    // چون backend لیست را بر اساس path مرتب کرده، فرزندان همیشه بعد از پدر می‌آیند و path پدر را دارند
    return allLocations.filter(
      (loc) =>
        loc.id !== editData.id && !loc.path.startsWith(editData.path + "/"),
    );
  }, [allLocations, mode, editData]);

  const onSubmit = async (values: LocationFormValues) => {
    try {
      const parentId =
        values.parentId === "root" ? null : Number(values.parentId);

      if (mode === "create") {
        await inventoryService.createLocation({
          warehouseId,
          title: values.title,
          code: values.code,
          parentId,
          isBlocked: values.isBlocked,
        });
        toast.success("لوکیشن با موفقیت ایجاد شد");
      } else if (editData) {
        await inventoryService.updateLocation(editData.id, {
          id: editData.id,
          title: values.title,
          code: values.code,
          parentId,
          isBlocked: values.isBlocked,
          rowVersion: editData.rowVersion,
        });
        toast.success("لوکیشن با موفقیت ویرایش شد");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در عملیات");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? parentLocation
                ? `افزودن زیرمجموعه به: ${parentLocation.title}`
                : "تعریف لوکیشن جدید"
              : "ویرایش لوکیشن"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>موقعیت والد</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب والد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="root">-- ریشه (اصلی) --</SelectItem>
                      {validParents.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {/* نمایش فاصله برای درک ساختار درختی در کمبو */}
                          <span style={{ marginRight: `${loc.level * 10}px` }}>
                            {loc.code} - {loc.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>کد لوکیشن</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: A-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: ردیف 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isBlocked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>مسدود شده</FormLabel>
                    <FormDescription>
                      غیرفعال کردن ورود و خروج کالا
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                {mode === "create" ? "ایجاد" : "ذخیره تغییرات"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
