"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PackagePlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { DateField, NumberField, SelectField } from "@/components/form/fields";
import { productionService } from "@/services/productionService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import { InventoryNature } from "@/types/inventory";
import type { ProductionOrderDto } from "@/types/api";
import { useDocTargetOptions } from "./useDocTargetOptions";

// هم‌راستا با ReceiveProductionOutputValidator در بک‌اند
const schema = z
  .object({
    docTypeId: z.number({ message: "نوع سند را انتخاب کنید" }).positive("نوع سند را انتخاب کنید"),
    warehouseId: z.number({ message: "انبار را انتخاب کنید" }).positive("انبار را انتخاب کنید"),
    locationId: z.number({ message: "قفسه را انتخاب کنید" }).positive("قفسه را انتخاب کنید"),
    docDate: z.string().min(1, "تاریخ سند را وارد کنید"),
    quantity: z.number({ message: "مقدار محصول را وارد کنید" }).nonnegative("مقدار نمی‌تواند منفی باشد"),
    scrapQuantity: z.number({ message: "مقدار ضایعات را وارد کنید" }).nonnegative("مقدار نمی‌تواند منفی باشد"),
    scrapLocationId: z.number().nullable(),
  })
  .refine((v) => v.quantity + v.scrapQuantity > 0, {
    path: ["quantity"],
    message: "مقدار محصول یا ضایعات باید بیشتر از صفر باشد",
  });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  order: ProductionOrderDto;
  /** پیش‌فرض مقدار محصول: مقدار سفارش منهای دریافت‌شده و در جریان */
  remainingQuantity: number;
  onClose: () => void;
  onReceived: (docId: number) => void;
}

/** رسید محصول و ضایعات: سند وارده پیش‌نویس با یک سطر محصول سالم و یک سطر ضایعات */
export default function ReceiveOutputDialog({ open, order, remainingQuantity, onClose, onReceived }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const warehouseId = form.watch("warehouseId");
  const scrapQuantity = form.watch("scrapQuantity");
  const { docTypes, warehouses, locations } = useDocTargetOptions(open, InventoryNature.Input, warehouseId);

  useEffect(() => {
    if (!open) return;
    form.reset({
      docTypeId: 0,
      warehouseId: 0,
      locationId: 0,
      docDate: new Date().toISOString(),
      quantity: remainingQuantity,
      scrapQuantity: 0,
      scrapLocationId: null,
    });
    // فقط با باز شدن دیالوگ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    form.setValue("locationId", 0);
    form.setValue("scrapLocationId", null);
  }, [warehouseId, form]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const docId = await productionService.receiveOutput({ ...values, id: order.id });
      onReceived(docId);
    } catch (error) {
      handleApiError(error, "خطا در ساخت رسید محصول");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof Values, e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            رسید محصول سفارش {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            {order.productCode} - {order.productName}. یک سند وارده پیش‌نویس ساخته می‌شود؛ ضایعات هم با سطر جدا وارد
            موجودی می‌شود، پس برای آن قفسه ضایعات جدا انتخاب کنید.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField control={form.control} name="docTypeId" label="نوع سند (وارده)" required options={docTypes} />
              <DateField control={form.control} name="docDate" label="تاریخ سند" required />
              <SelectField control={form.control} name="warehouseId" label="انبار" required options={warehouses} />
              <SelectField
                control={form.control}
                name="locationId"
                label="قفسه محصول"
                required
                options={locations}
                disabled={!warehouseId}
              />
              <NumberField control={form.control} name="quantity" label={`محصول سالم (${order.unitName})`} min={0} step={0.0001} />
              <NumberField control={form.control} name="scrapQuantity" label={`ضایعات (${order.unitName})`} min={0} step={0.0001} />
              {Number(scrapQuantity) > 0 && (
                <SelectField
                  control={form.control}
                  name="scrapLocationId"
                  label="قفسه ضایعات"
                  noneLabel="همان قفسه محصول"
                  options={locations}
                  disabled={!warehouseId}
                  className="sm:col-span-2"
                />
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
                ساخت رسید
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
