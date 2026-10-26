"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Factory, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DateField, NumberField, SelectField, TextareaField } from "@/components/form/fields";
import { TableLookupCombobox, type ColumnDef } from "@/components/ui/TableLookupCombobox";
import { productService } from "@/services/baseInfoService";
import { productionService } from "@/services/productionService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { ProductionBomOptionDto, ProductionOrderDto, ProductionRequirementsDto } from "@/types/api";
import MaterialRequirementsTable from "./MaterialRequirementsTable";

// هم‌راستا با CreateProductionOrderValidator و UpdateProductionOrderValidator در بک‌اند
const schema = z
  .object({
    productId: z.number({ message: "کالا را انتخاب کنید" }).positive("کالا را انتخاب کنید"),
    bomHeaderId: z.number().nullable(),
    quantity: z.number({ message: "مقدار تولید را وارد کنید" }).positive("مقدار تولید باید بیشتر از صفر باشد"),
    plannedStartDate: z.string().nullable(),
    plannedEndDate: z.string().nullable(),
    description: z.string().max(500, "حداکثر ۵۰۰ کاراکتر"),
  })
  .refine((v) => !v.plannedStartDate || !v.plannedEndDate || v.plannedEndDate.slice(0, 10) >= v.plannedStartDate.slice(0, 10), {
    path: ["plannedEndDate"],
    message: "تاریخ پایان برنامه نمی‌تواند قبل از تاریخ شروع باشد",
  });
type Values = z.infer<typeof schema>;

interface ProductOption {
  id: number;
  code: string;
  name: string;
  unitName: string;
}

const productColumns: ColumnDef[] = [
  { key: "code", label: "کد کالا", width: "30%" },
  { key: "name", label: "نام کالا", width: "50%" },
  { key: "unitName", label: "واحد", width: "20%" },
];

const EMPTY: Values = {
  productId: 0,
  bomHeaderId: null,
  quantity: 1,
  plannedStartDate: null,
  plannedEndDate: null,
  description: "",
};

interface Props {
  open: boolean;
  /** برای ویرایش سفارش پیش‌نویس */
  order?: ProductionOrderDto | null;
  onClose: () => void;
  onSaved: (id: number) => void;
}

/** ثبت یا ویرایش سفارش تولید با پیش‌نمایش نیاز مواد از فرمول انتخاب‌شده */
export default function ProductionOrderDialog({ open, order, onClose, onSaved }: Props) {
  const isEdit = !!order;
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [boms, setBoms] = useState<ProductionBomOptionDto[]>([]);
  const [preview, setPreview] = useState<ProductionRequirementsDto | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const productId = form.watch("productId");
  const bomHeaderId = form.watch("bomHeaderId");
  const quantity = form.watch("quantity");

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setBoms([]);
    form.reset(
      order
        ? {
            productId: order.productId,
            bomHeaderId: order.bomHeaderId,
            quantity: order.quantity,
            plannedStartDate: order.plannedStartDate ?? null,
            plannedEndDate: order.plannedEndDate ?? null,
            description: order.description ?? "",
          }
        : EMPTY,
    );
    if (order)
      setProducts([{ id: order.productId, code: order.productCode, name: order.productName, unitName: order.unitName }]);
    // فقط با باز شدن دیالوگ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  // فرمول‌های کالا؛ اولی پیش‌فرض است
  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    productionService
      .getBoms(productId)
      .then((rows) => {
        if (cancelled) return;
        setBoms(rows);
        const current = form.getValues("bomHeaderId");
        if (!rows.some((b) => b.id === current)) form.setValue("bomHeaderId", rows[0]?.id ?? null);
      })
      .catch((error) => handleApiError(error, "خطا در دریافت فرمول‌های کالا"));
    return () => {
      cancelled = true;
    };
  }, [open, productId, form]);

  // پیش‌نمایش نیاز مواد با تأخیر کوتاه پس از تغییر مقدار
  useEffect(() => {
    if (!open || !productId || !bomHeaderId || !(Number(quantity) > 0)) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      productionService
        .previewRequirements(productId, bomHeaderId, Number(quantity))
        .then((res) => {
          if (cancelled) return;
          setPreview(res);
          setPreviewError(null);
        })
        .catch(() => !cancelled && setPreviewError("نیاز مواد محاسبه نشد"));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, productId, bomHeaderId, quantity]);

  const searchProducts = async (term: string) => {
    setProductsLoading(true);
    try {
      const res = await productService.search({ pageNumber: 1, pageSize: 20, searchTerm: term });
      setProducts(res.items as ProductOption[]);
    } finally {
      setProductsLoading(false);
    }
  };

  const submit = async (values: Values) => {
    setSubmitting(true);
    const payload = {
      bomHeaderId: values.bomHeaderId,
      quantity: values.quantity,
      plannedStartDate: values.plannedStartDate,
      plannedEndDate: values.plannedEndDate,
      description: values.description || null,
    };
    try {
      if (order) {
        await productionService.updateOrder(order.id, { ...payload, id: order.id, rowVersion: order.rowVersion });
        toast.success("سفارش تولید ویرایش شد");
        onSaved(order.id);
      } else {
        const id = await productionService.createOrder({ ...payload, productId: values.productId });
        toast.success("سفارش تولید ثبت شد");
        onSaved(id);
      }
    } catch (error) {
      handleApiError(error, isEdit ? "خطا در ویرایش سفارش تولید" : "خطا در ثبت سفارش تولید");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof Values, e));
    } finally {
      setSubmitting(false);
    }
  };

  const productError = form.formState.errors.productId?.message;
  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            {isEdit ? `ویرایش سفارش تولید ${order?.orderNumber}` : "سفارش تولید جدید"}
          </DialogTitle>
          <DialogDescription>
            نیاز مواد از فرمول انتخاب‌شده و به نسبت مقدار پایه آن محاسبه می‌شود و درصد ضایعات هر قلم به آن اضافه می‌شود.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="production-order-form" onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel>
                کالای تولیدی<span className="ms-0.5 text-destructive" aria-hidden>*</span>
              </FormLabel>
              <TableLookupCombobox<ProductOption>
                value={productId || null}
                items={products}
                loading={productsLoading}
                columns={productColumns}
                searchableFields={["code", "name"]}
                displayFields={["code", "name"]}
                placeholder="جستجوی کالا..."
                ariaLabel="کالای تولیدی"
                aria-invalid={!!productError}
                disabled={isEdit}
                onSearch={searchProducts}
                onOpenChange={(o) => o && products.length === 0 && searchProducts("")}
                onValueChange={(id) => {
                  form.setValue("productId", (id as number) ?? 0, { shouldValidate: form.formState.isSubmitted });
                  form.setValue("bomHeaderId", null);
                }}
              />
              {productError && <FormMessage>{productError}</FormMessage>}
            </FormItem>
            <SelectField
              control={form.control}
              name="bomHeaderId"
              label="فرمول ساخت"
              required
              disabled={!productId || boms.length === 0}
              placeholder={productId && boms.length === 0 ? "فرمول فعالی ندارد" : "انتخاب کنید"}
              options={boms.map((b) => ({
                value: b.id,
                label: `${b.title} (نسخه ${b.version}${b.isMain ? "، پیش‌فرض" : ""})`,
              }))}
            />
            <NumberField
              control={form.control}
              name="quantity"
              label={`مقدار تولید${selectedProduct?.unitName ? ` (${selectedProduct.unitName})` : ""}`}
              required
              min={0}
              step={0.001}
            />
            <div className="hidden sm:block" />
            <DateField control={form.control} name="plannedStartDate" label="شروع برنامه" />
            <DateField control={form.control} name="plannedEndDate" label="پایان برنامه" />
            <TextareaField control={form.control} name="description" label="توضیحات" className="sm:col-span-2" />
          </form>
        </Form>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            نیاز مواد
            {preview && (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                فرمول برای {preview.bomBaseQuantity.toLocaleString("fa-IR")} واحد
              </span>
            )}
          </h3>
          {previewError ? (
            <p className="text-sm text-destructive">{previewError}</p>
          ) : preview ? (
            <MaterialRequirementsTable materials={preview.materials} />
          ) : (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              کالا، فرمول و مقدار را وارد کنید.
            </p>
          )}
        </section>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            انصراف
          </Button>
          <Button type="submit" form="production-order-form" disabled={submitting}>
            {submitting && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            {isEdit ? "ذخیره سفارش" : "ثبت سفارش"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
