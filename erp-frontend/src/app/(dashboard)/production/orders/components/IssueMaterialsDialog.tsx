"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PackageMinus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { DateField, SelectField } from "@/components/form/fields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productionService } from "@/services/productionService";
import { applyFieldErrors, handleApiError } from "@/lib/error-handling";
import { InventoryNature } from "@/types/inventory";
import type { ProductionMaterialProgressDto, ProductionOrderDto } from "@/types/api";
import { useDocTargetOptions } from "./useDocTargetOptions";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });

// هم‌راستا با IssueProductionMaterialsValidator در بک‌اند؛ مقدار صفر یعنی این ماده در حواله نمی‌آید
const schema = z
  .object({
    docTypeId: z.number({ message: "نوع سند را انتخاب کنید" }).positive("نوع سند را انتخاب کنید"),
    warehouseId: z.number({ message: "انبار را انتخاب کنید" }).positive("انبار را انتخاب کنید"),
    locationId: z.number({ message: "قفسه را انتخاب کنید" }).positive("قفسه را انتخاب کنید"),
    docDate: z.string().min(1, "تاریخ سند را وارد کنید"),
    lines: z.array(
      z.object({
        materialId: z.number(),
        quantity: z.number({ message: "مقدار نامعتبر است" }).nonnegative("مقدار نمی‌تواند منفی باشد"),
      }),
    ),
  })
  .refine((v) => v.lines.some((l) => l.quantity > 0), {
    path: ["lines"],
    message: "حداقل برای یک ماده اولیه مقدار بیشتر از صفر وارد کنید",
  });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  order: ProductionOrderDto;
  /** فقط سطرهای فرمول (MaterialId دار) */
  materials: ProductionMaterialProgressDto[];
  onClose: () => void;
  onIssued: (docId: number) => void;
}

/**
 * حواله مواد: سند صادره پیش‌نویس با ارجاع به سفارش؛ مقدار پیش‌فرض هر ماده، باقیمانده نیاز آن است.
 * بچ، سریال و قفسه دقیق سطرها در فرم سند انبار تکمیل می‌شود.
 */
export default function IssueMaterialsDialog({ open, order, materials, onClose, onIssued }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const warehouseId = form.watch("warehouseId");
  const { docTypes, warehouses, locations } = useDocTargetOptions(open, InventoryNature.Output, warehouseId);

  useEffect(() => {
    if (!open) return;
    form.reset({
      docTypeId: 0,
      warehouseId: 0,
      locationId: 0,
      docDate: new Date().toISOString(),
      lines: materials.map((m) => ({ materialId: m.materialId!, quantity: m.remainingQuantity })),
    });
    // فقط با باز شدن دیالوگ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    form.setValue("locationId", 0);
  }, [warehouseId, form]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const docId = await productionService.issueMaterials({
        id: order.id,
        docTypeId: values.docTypeId,
        warehouseId: values.warehouseId,
        locationId: values.locationId,
        docDate: values.docDate,
        lines: values.lines.filter((l) => l.quantity > 0),
      });
      onIssued(docId);
    } catch (error) {
      handleApiError(error, "خطا در ساخت حواله مواد");
      applyFieldErrors(error, (name, e) => form.setError(name as keyof Values, e));
    } finally {
      setSubmitting(false);
    }
  });

  const linesError = form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-primary" />
            حواله مواد سفارش {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            یک سند صادره پیش‌نویس ساخته می‌شود. بچ، سریال و قفسه هر سطر را در فرم سند تکمیل و سند را برای تأیید ارسال کنید.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField control={form.control} name="docTypeId" label="نوع سند (صادره)" required options={docTypes} />
              <DateField control={form.control} name="docDate" label="تاریخ سند" required />
              <SelectField control={form.control} name="warehouseId" label="انبار" required options={warehouses} />
              <SelectField
                control={form.control}
                name="locationId"
                label="قفسه پیش‌فرض"
                required
                options={locations}
                disabled={!warehouseId}
              />
            </div>

            <div className="rounded-md border">
              <Table aria-label="مواد حواله">
                <TableHeader>
                  <TableRow>
                    <TableHead>ماده اولیه</TableHead>
                    <TableHead>نیاز</TableHead>
                    <TableHead>صادرشده و در جریان</TableHead>
                    <TableHead className="w-36">مقدار این حواله</TableHead>
                    <TableHead>واحد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m, i) => (
                    <TableRow key={m.materialId}>
                      <TableCell>
                        <span dir="ltr" className="me-2 font-mono text-xs text-muted-foreground">
                          {m.productCode}
                        </span>
                        {m.productName}
                      </TableCell>
                      <TableCell className="tabular-nums">{fmt(m.requiredQuantity)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(m.issuedQuantity + m.pendingIssueQuantity)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          inputMode="decimal"
                          dir="ltr"
                          min={0}
                          step="any"
                          className="h-8 text-start"
                          aria-label={`مقدار حواله ${m.productName}`}
                          aria-invalid={!!form.formState.errors.lines?.[i]?.quantity}
                          {...form.register(`lines.${i}.quantity`, {
                            setValueAs: (v) => (v === "" ? 0 : Number(v)),
                          })}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.unitName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {linesError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {linesError}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
                ساخت حواله
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
