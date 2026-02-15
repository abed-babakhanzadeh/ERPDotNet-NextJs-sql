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
import PersianDatePicker from "@/components/ui/PersianDatePicker";

import inventoryService from "@/services/inventoryService";
import { InventoryBatchDto } from "@/types/inventory";

const createBatchSchema = z.object({
  batchNumber: z.string().min(1, "شماره بچ الزامی است"),
  supplierBatchCode: z.string().optional(),
  manufactureDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
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

  const [editingBatch, setEditingBatch] = useState<InventoryBatchDto | null>(
    null,
  );

  const form = useForm<z.infer<typeof createBatchSchema>>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      batchNumber: "",
      supplierBatchCode: "",
      description: "",
      manufactureDate: "",
      expiryDate: "",
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
    if (productId) {
      loadBatches();
    }
  }, [productId]);

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        setEditingBatch(null);
        form.reset({
          batchNumber: "",
          supplierBatchCode: "",
          description: "",
          manufactureDate: "",
          expiryDate: "",
        });
      }, 300);
    }
  };

  const onEditClick = (batch: InventoryBatchDto) => {
    setEditingBatch(batch);
    form.reset({
      batchNumber: batch.batchNumber ?? "",
      supplierBatchCode: batch.supplierBatchCode ?? "",
      description: batch.description ?? "",
      manufactureDate: batch.manufactureDate
        ? new Date(batch.manufactureDate).toISOString()
        : "",
      expiryDate: batch.expiryDate
        ? new Date(batch.expiryDate).toISOString()
        : "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof createBatchSchema>) => {
    try {
      const safeDate = (d: string | null | undefined) => {
        if (!d || d.trim() === "") return null;
        return new Date(d);
      };

      const manufactureDate = safeDate(values.manufactureDate);
      const expiryDate = safeDate(values.expiryDate);

      if (editingBatch) {
        await inventoryService.updateBatch(editingBatch.id, {
          id: editingBatch.id,
          batchNumber: values.batchNumber,
          supplierBatchCode: values.supplierBatchCode,
          description: values.description,
          manufactureDate,
          expiryDate,
          isBlocked: editingBatch.isBlocked,
          rowVersion: editingBatch.rowVersion,
        });
        toast.success("بچ ویرایش شد");
      } else {
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
      console.error(error);
      const serverMessage =
        error.response?.data?.detail ||
        error.response?.data?.title ||
        "خطا در عملیات";
      if (serverMessage.includes("پروفایل") || error.response?.status === 500) {
        toast.error(
          "خطا: لطفاً ابتدا در تب 'تنظیمات انبار'، تیک 'مدیریت بچ' را فعال و ذخیره کنید.",
        );
      } else {
        toast.error(serverMessage);
      }
    }
  };

  const toggleBlock = async (batch: InventoryBatchDto) => {
    try {
      await inventoryService.updateBatch(batch.id, {
        id: batch.id,
        isBlocked: !batch.isBlocked,
        rowVersion: batch.rowVersion,
        batchNumber: batch.batchNumber,
        // ارسال مجدد سایر فیلدها برای جلوگیری از حذف شدن
        supplierBatchCode: batch.supplierBatchCode,
        description: batch.description,
        manufactureDate: batch.manufactureDate
          ? new Date(batch.manufactureDate)
          : null,
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
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
            <DialogContent className="text-right sm:max-w-[500px]" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right font-bold text-lg border-b pb-2">
                  {editingBatch ? "ویرایش اطلاعات بچ" : "تعریف بچ جدید"}
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
                        <FormLabel>
                          شماره بچ (Batch No){" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
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
                            <PersianDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="انتخاب تاریخ"
                            />
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
                            <PersianDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="انتخاب تاریخ"
                            />
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
                        <FormLabel>کد بچ تامین کننده</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="کد ردیابی تامین کننده"
                          />
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
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="توضیحات تکمیلی..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="gap-2 min-w-[120px]">
                      <Save size={16} />
                      {editingBatch ? "ذخیره تغییرات" : "ثبت بچ"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">شماره بچ</TableHead>
              <TableHead className="text-right">کد تامین کننده</TableHead>
              <TableHead className="text-right">تاریخ تولید / انقضا</TableHead>
              {/* ستون جدید توضیحات */}
              <TableHead className="text-right">توضیحات</TableHead>
              <TableHead className="text-center">وضعیت</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  <Loader2 className="animate-spin inline text-primary" />
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  هیچ بچی برای این کالا تعریف نشده است.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  {/* اصلاح شماره بچ: راست‌چین در سلول، اما چپ‌چین در متن */}
                  <TableCell className="text-right">
                    <span
                      className="font-mono font-bold inline-block"
                      dir="ltr"
                    >
                      {batch.batchNumber}
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-sm">
                    {batch.supplierBatchCode || "-"}
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-1">
                      {batch.manufactureDate && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground w-4">ت:</span>
                          <span>
                            {new Date(batch.manufactureDate).toLocaleDateString(
                              "fa-IR",
                            )}
                          </span>
                        </div>
                      )}
                      {batch.expiryDate && (
                        <div
                          className={`flex items-center gap-1 ${batch.isExpired ? "text-red-600 font-bold" : ""}`}
                        >
                          <span className="text-muted-foreground w-4">ا:</span>
                          <span>
                            {new Date(batch.expiryDate).toLocaleDateString(
                              "fa-IR",
                            )}
                          </span>
                          {batch.isExpired && (
                            <span className="text-[10px] bg-red-100 px-1 rounded">
                              منقضی
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* نمایش توضیحات */}
                  <TableCell
                    className="text-muted-foreground text-sm max-w-[150px] truncate"
                    title={batch.description || ""}
                  >
                    {batch.description || "-"}
                  </TableCell>

                  <TableCell className="text-center">
                    {batch.isBlocked ? (
                      <Badge variant="destructive" className="gap-1 px-2">
                        <Ban size={12} /> مسدود
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2"
                      >
                        <CheckCircle size={12} /> فعال
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {!isViewMode && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          title="ویرایش"
                          onClick={() => onEditClick(batch)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-auto px-3 text-xs border ${batch.isBlocked ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                          onClick={() => toggleBlock(batch)}
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
