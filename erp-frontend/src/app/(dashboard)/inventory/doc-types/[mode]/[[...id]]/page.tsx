"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import BaseFormLayout from "@/components/layout/BaseFormLayout";
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
import { InventoryDocTypeDto } from "@/types/inventory";

const formSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  nature: z.coerce.number().min(1, "انتخاب ماهیت الزامی است"),
  numberingScope: z.coerce
    .number()
    .min(1, "انتخاب دامنه شماره‌گذاری الزامی است"),
  requiredPermissionName: z.string().optional(),
  affectsCost: z.boolean().default(false),
  isReferenceRequired: z.boolean().default(false),
  allowedReferenceEntityNames: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export default function DocTypeFormPage() {
  const router = useRouter();
  const params = useParams();
  const mode = params.mode as "create" | "edit";
  const id = params.id?.[0];

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docData, setDocData] = useState<InventoryDocTypeDto | null>(null);

  const [natureOptions, setNatureOptions] = useState<any[]>([]);
  const [scopeOptions, setScopeOptions] = useState<any[]>([]);
  const [systemEntities, setSystemEntities] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      nature: 0,
      numberingScope: 1,
      requiredPermissionName: "",
      affectsCost: true,
      isReferenceRequired: false,
      allowedReferenceEntityNames: [],
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [natures, scopes, entities] = await Promise.all([
          inventoryService.getInventoryNatures(),
          inventoryService.getNumberingScopes(),
          inventoryService.getSystemEntities(),
        ]);

        setNatureOptions(Array.isArray(natures) ? natures : []);
        setScopeOptions(Array.isArray(scopes) ? scopes : []);
        setSystemEntities(Array.isArray(entities) ? entities : []);

        if (mode === "edit" && id) {
          setLoading(true);
          const data = await inventoryService.getDocTypeById(Number(id));
          setDocData(data);
          form.reset({
            title: data.title,
            nature: data.natureValue,
            numberingScope: data.numberingScope,
            requiredPermissionName: data.requiredPermissionName || "",
            affectsCost: data.affectsCost,
            isReferenceRequired: data.isReferenceRequired,
            allowedReferenceEntityNames: data.allowedReferenceEntityNames || [],
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("خطا در بارگذاری اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mode, id, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await inventoryService.createDocType(values);
        toast.success("نوع سند با موفقیت ایجاد شد");
      } else {
        if (!docData) return;
        await inventoryService.updateDocType(Number(id), {
          ...values,
          id: Number(id),
          rowVersion: docData.rowVersion,
        });
        toast.success("ویرایش با موفقیت انجام شد");
      }
      router.push("/inventory/doc-types");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در عملیات");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseFormLayout
      title={
        mode === "create"
          ? "تعریف نوع سند جدید"
          : `ویرایش سند: ${docData?.title || ""}`
      }
      isLoading={loading}
      isSubmitting={isSubmitting}
      formId="doctype-form"
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={() => router.push("/inventory/doc-types")}
      submitText={mode === "create" ? "ثبت" : "ذخیره تغییرات"}
    >
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان نوع سند</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: رسید خرید داخلی" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ماهیت سند</FormLabel>
                <Select
                  disabled={mode === "edit"}
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={
                    field.value && field.value !== 0
                      ? field.value.toString()
                      : undefined
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {natureOptions.map((opt: any) => {
                      // دریافت ایمن مقدار و عنوان
                      const val = opt.value ?? opt.Value;
                      const lbl =
                        opt.key ??
                        opt.Key ??
                        opt.label ??
                        opt.Label ??
                        "بدون عنوان";
                      return (
                        <SelectItem key={val} value={val.toString()}>
                          {lbl}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {mode === "edit" && (
                  <FormDescription>
                    ماهیت سند پس از ایجاد قابل تغییر نیست.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberingScope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>روش شماره‌گذاری</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={
                    field.value && field.value !== 0
                      ? field.value.toString()
                      : undefined
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {scopeOptions.map((opt: any) => {
                      const val = opt.value ?? opt.Value;
                      const lbl =
                        opt.key ??
                        opt.Key ??
                        opt.label ??
                        opt.Label ??
                        "بدون عنوان";
                      return (
                        <SelectItem key={val} value={val.toString()}>
                          {lbl}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiredPermissionName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نام پرمیشن اختصاصی (اختیاری)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="مثال: Inventory.SpecialDoc.Create"
                    className="font-mono text-xs"
                  />
                </FormControl>
                <FormDescription>
                  اگر پر شود، کاربر باید حتما این پرمیشن را داشته باشد.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/20">
            <FormField
              control={form.control}
              name="affectsCost"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none mr-2">
                    <FormLabel>تأثیر در بهای تمام شده (ریالی)</FormLabel>
                    <FormDescription>
                      آیا این سند بار مالی دارد و در محاسبه نرخ میانگین مؤثر
                      است؟
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReferenceRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none mr-2">
                    <FormLabel>رفرنس (عطف) اجباری است</FormLabel>
                    <FormDescription>
                      کاربر حتما باید مبنای سند (مثلا پروژه یا مرکز هزینه) را
                      مشخص کند.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-1 md:col-span-2 mt-4">
            <h3 className="mb-4 text-sm font-medium">
              موجودیت‌های مجاز برای رفرنس (عطف)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="allowedReferenceEntityNames"
                render={() => (
                  <FormItem className="contents">
                    {systemEntities.map((entity) => {
                      // اصلاحیه کلیدی: خواندن هر نوع Case (بزرگ و کوچک) برای جلوگیری از undefined
                      const entityValue =
                        entity.value || entity.Value || entity.id || entity.Id;
                      const entityLabel =
                        entity.label ||
                        entity.Label ||
                        entity.title ||
                        entity.Title;

                      return (
                        <FormField
                          key={entityValue}
                          control={form.control}
                          name="allowedReferenceEntityNames"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={entityValue}
                                className="flex flex-row items-start space-x-3 space-x-reverse space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(entityValue)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            entityValue,
                                          ])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value: string) =>
                                                value !== entityValue,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal mr-2 cursor-pointer">
                                  {entityLabel}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      );
                    })}
                  </FormItem>
                )}
              />
            </div>
            <FormMessage>
              {form.formState.errors.allowedReferenceEntityNames?.message}
            </FormMessage>
          </div>
        </div>
      </Form>
    </BaseFormLayout>
  );
}
