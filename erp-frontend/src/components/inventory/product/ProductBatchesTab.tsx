"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Ban, CheckCircle, Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import inventoryService from "@/services/inventoryService";
import { InventoryBatchDto } from "@/types/inventory";

const createBatchSchema = z.object({
  batchNumber: z.string().min(1, "شماره بچ الزامی است"),
  supplierBatchCode: z.string().optional(),
  manufactureDate: z.string().optional(),
  expiryDate: z.string().optional(),
  description: z.string().optional(),
});

interface Props {
  productId: number;
  isViewMode: boolean;
}

export default function ProductBatchesTab({ productId, isViewMode }: Props) {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<InventoryBatchDto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // استیت برای ویرایش
  const [editingBatch, setEditingBatch] = useState<InventoryBatchDto | null>(
    null,
  );

  const form = useForm<z.infer<typeof createBatchSchema>>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      batchNumber: "",
      supplierBatchCode: "",
      description: "",
    },
  });

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getProductBatches(productId, true);
      setBatches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [productId]);

  // ریست فرم هنگام بستن دیالوگ
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingBatch(null);
      form.reset({
        batchNumber: "",
        supplierBatchCode: "",
        description: "",
        manufactureDate: "",
        expiryDate: "",
      });
    }
  };

  const onEditClick = (batch: InventoryBatchDto) => {
    setEditingBatch(batch);
    // فرمت کردن تاریخ برای اینپوت date
    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d).toISOString().split("T")[0] : "";

    form.reset({
      batchNumber: batch.batchNumber,
      supplierBatchCode: batch.supplierBatchCode || "",
      description: batch.description || "",
      manufactureDate: fmtDate(batch.manufactureDate as any),
      expiryDate: fmtDate(batch.expiryDate as any),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof createBatchSchema>) => {
    try {
      const manufactureDate = values.manufactureDate
        ? new Date(values.manufactureDate)
        : null;
      const expiryDate = values.expiryDate ? new Date(values.expiryDate) : null;

      if (editingBatch) {
        // آپدیت
        await inventoryService.updateBatch(editingBatch.id, {
          id: editingBatch.id,
          batchNumber: values.batchNumber,
          supplierBatchCode: values.supplierBatchCode,
          description: values.description,
          manufactureDate,
          expiryDate,
          isBlocked: editingBatch.isBlocked, // وضعیت فعلی حفظ شود
          rowVersion: editingBatch.rowVersion,
        });
        toast.success("بچ ویرایش شد");
      } else {
        // ایجاد
        await inventoryService.createBatch({
          productId,
          batchNumber: values.batchNumber,
          supplierBatchCode: values.supplierBatchCode,
          description: values.description,
          manufactureDate,
          expiryDate,
        });
        toast.success("بچ جدید ایجاد شد");
      }

      handleDialogChange(false);
      loadBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در عملیات");
    }
  };

  const toggleBlock = async (batch: InventoryBatchDto) => {
    try {
      await inventoryService.updateBatch(batch.id, {
        id: batch.id,
        isBlocked: !batch.isBlocked,
        rowVersion: batch.rowVersion,
        batchNumber: batch.batchNumber, // الزامی است طبق DTO
      });
      toast.success("وضعیت بچ تغییر کرد");
      loadBatches();
    } catch (err) {
      toast.error("خطا در تغییر وضعیت");
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">لیست بچ‌های تعریف شده</h3>

        {!isViewMode && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={16} /> بچ جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="text-right" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">
                  {editingBatch ? "ویرایش بچ" : "تعریف بچ جدید"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 mt-2"
                >
                  <FormField
                    control={form.control}
                    name="batchNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>شماره بچ (Batch No)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="مثال: B-2024-001"
                            className="text-left font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufactureDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاریخ تولید</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاریخ انقضا</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="supplierBatchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>کد بچ تامین کننده (اختیاری)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full gap-2">
                    <Save size={16} />
                    {editingBatch ? "ذخیره تغییرات" : "ثبت بچ"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شماره بچ</TableHead>
              <TableHead className="text-right">انقضا</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">کد تامین کننده</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <Loader2 className="animate-spin inline" />
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  هیچ بچی تعریف نشده است.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell
                    className="font-mono font-bold text-left"
                    dir="ltr"
                  >
                    {batch.batchNumber}
                  </TableCell>
                  <TableCell>
                    {batch.expiryDate
                      ? new Date(batch.expiryDate).toLocaleDateString("fa-IR")
                      : "-"}
                    {batch.isExpired && (
                      <span className="text-red-500 text-xs mr-2 font-bold">
                        (منقضی)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {batch.isBlocked ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban size={12} /> مسدود
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      >
                        <CheckCircle size={12} /> فعال
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {batch.supplierBatchCode || "-"}
                  </TableCell>
                  <TableCell>
                    {!isViewMode && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 w-7 text-blue-600 hover:bg-blue-50"
                          title="ویرایش"
                          onClick={() => onEditClick(batch)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 w-auto px-2"
                          onClick={() => toggleBlock(batch)}
                          title={batch.isBlocked ? "آزاد سازی" : "مسدود سازی"}
                        >
                          {batch.isBlocked ? "آزاد" : "مسدود"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
