"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardPen, Loader2 } from "lucide-react";

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
import { DateField, NumberField, TextareaField } from "@/components/form/fields";
import { productionService } from "@/services/productionService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import type { ProductionOperationDto } from "@/types/api";

// هم‌راستا با ReportOperationValidator در بک‌اند
const nonNegative = (label: string) =>
  z.number({ message: `${label} را وارد کنید` }).nonnegative(`${label} نمی‌تواند منفی باشد`);
const schema = z
  .object({
    reportDate: z.string().min(1, "تاریخ را وارد کنید"),
    goodQuantity: nonNegative("مقدار سالم"),
    scrapQuantity: nonNegative("مقدار ضایعات"),
    setupMinutes: nonNegative("زمان آماده‌سازی"),
    runMinutes: nonNegative("زمان اجرا"),
    note: z.string().max(500, "حداکثر ۵۰۰ کاراکتر"),
  })
  .refine((v) => v.goodQuantity + v.scrapQuantity + v.setupMinutes + v.runMinutes > 0, {
    path: ["goodQuantity"],
    message: "مقدار یا زمانی برای گزارش کارکرد وارد نشده است",
  });
type Values = z.infer<typeof schema>;

interface Props {
  orderId: number;
  unitName: string;
  operation: ProductionOperationDto | null;
  onClose: () => void;
  onSaved: () => void;
}

/** ثبت کارکرد یک عملیات: مقدار انجام‌شده و زمان واقعی */
export default function ReportOperationDialog({ orderId, unitName, operation, onClose, onSaved }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!operation) return;
    form.reset({
      reportDate: new Date().toISOString(),
      goodQuantity: 0,
      scrapQuantity: 0,
      // آماده‌سازی معمولاً فقط در اولین گزارش است
      setupMinutes: operation.reports.length === 0 ? operation.plannedSetupMinutes : 0,
      runMinutes: 0,
      note: "",
    });
  }, [operation, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!operation) return;
    setSubmitting(true);
    try {
      await productionService.reportOperation({ ...values, note: values.note || null, orderId, operationId: operation.id });
      onSaved();
    } catch (error) {
      handleApiError(error, "خطا در ثبت کارکرد");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof Values, e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={!!operation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPen className="h-5 w-5 text-primary" />
            ثبت کارکرد: {operation?.sequence.toLocaleString("fa-IR")} - {operation?.title}
          </DialogTitle>
          <DialogDescription>
            مرکز کاری {operation?.workCenterCode} - {operation?.workCenterTitle}. زمان‌ها به دقیقه است.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <DateField control={form.control} name="reportDate" label="تاریخ" required className="sm:col-span-2" />
            <NumberField control={form.control} name="goodQuantity" label={`مقدار سالم (${unitName})`} min={0} step={0.0001} />
            <NumberField control={form.control} name="scrapQuantity" label={`ضایعات (${unitName})`} min={0} step={0.0001} />
            <NumberField control={form.control} name="setupMinutes" label="آماده‌سازی (دقیقه)" min={0} step={1} />
            <NumberField control={form.control} name="runMinutes" label="اجرا (دقیقه)" min={0} step={1} />
            <TextareaField control={form.control} name="note" label="توضیحات" className="sm:col-span-2" />
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
                ثبت کارکرد
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
