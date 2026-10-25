"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardCheck, Loader2 } from "lucide-react";

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
import {
  DateField,
  SelectField,
  TextareaField,
} from "@/components/form/fields";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";

const schema = z.object({
  warehouseId: z
    .number({ message: "انبار را انتخاب کنید" })
    .positive("انبار را انتخاب کنید"),
  locationId: z.number().nullable(),
  countDate: z
    .string({ message: "تاریخ شمارش را وارد کنید" })
    .min(1, "تاریخ شمارش را وارد کنید"),
  description: z.string().max(500).optional(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onStarted: (id: number) => void;
}

/** شروع انبارگردانی: موجودی فعلی انبار (یا یک قفسه) به‌عنوان مبنای شمارش ثبت می‌شود */
export default function StartStockCountDialog({
  open,
  onClose,
  onStarted,
}: Props) {
  const [warehouses, setWarehouses] = useState<{ id: number; title: string }[]>(
    [],
  );
  const [locations, setLocations] = useState<{ id: number; title: string }[]>(
    [],
  );
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      warehouseId: 0,
      locationId: null,
      countDate: new Date().toISOString(),
      description: "",
    },
  });
  const warehouseId = form.watch("warehouseId");

  useEffect(() => {
    if (!open) return;
    inventoryService
      .getAllWarehouses()
      .then((res: any) =>
        setWarehouses(Array.isArray(res) ? res : (res?.items ?? [])),
      )
      .catch((error) => handleApiError(error, "خطا در دریافت لیست انبارها"));
  }, [open]);

  useEffect(() => {
    form.setValue("locationId", null);
    if (!warehouseId) return setLocations([]);
    inventoryService
      .getLocations(warehouseId)
      .then((res: any) =>
        setLocations(Array.isArray(res) ? res : (res?.items ?? [])),
      )
      .catch((error) => handleApiError(error, "خطا در دریافت قفسه‌ها"));
  }, [warehouseId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const id = await inventoryService.createStockCount({
        warehouseId: values.warehouseId,
        locationId: values.locationId,
        countDate: values.countDate,
        description: values.description || null,
      });
      form.reset();
      onStarted(id);
    } catch (error) {
      handleApiError(error, "خطا در شروع انبارگردانی");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            شروع انبارگردانی
          </DialogTitle>
          <DialogDescription>
            موجودی سیستمی همین لحظه مبنای شمارش می‌شود؛ اختلاف شمارش با آن، سند
            اصلاحی می‌شود.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <SelectField
              control={form.control}
              name="warehouseId"
              label="انبار"
              required
              options={warehouses.map((w) => ({ label: w.title, value: w.id }))}
            />
            <SelectField
              control={form.control}
              name="locationId"
              label="قفسه"
              noneLabel="همه قفسه‌ها"
              options={locations.map((l) => ({ label: l.title, value: l.id }))}
              disabled={!warehouseId}
            />
            <DateField
              control={form.control}
              name="countDate"
              label="تاریخ شمارش"
              required
            />
            <TextareaField
              control={form.control}
              name="description"
              label="توضیحات"
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
                )}
                شروع شمارش
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
