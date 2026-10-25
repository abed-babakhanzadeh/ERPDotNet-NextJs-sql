"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { handleApiError } from "@/lib/error-handling";
import inventoryService from "@/services/inventoryService";
import type { StockRebuildRowDto } from "@/types/inventory";

const fmt = (n: number) => n.toLocaleString("fa-IR");

interface StockRebuildDialogProps {
  onRebuilt: () => void;
}

/**
 * بازسازی موجودی لحظه‌ای از روی دفتر تراکنش‌ها.
 * ابتدا اختلاف‌ها را نشان می‌دهد و فقط پس از تأیید کاربر اعمال می‌کند.
 */
export function StockRebuildDialog({ onRebuilt }: StockRebuildDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState<StockRebuildRowDto[] | null>(null);

  const openAndPreview = async () => {
    setOpen(true);
    setRows(null);
    setLoading(true);
    try {
      setRows(await inventoryService.previewStockRebuild());
    } catch (error) {
      handleApiError(error, "خطا در مقایسه موجودی‌ها");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      const result = await inventoryService.rebuildStock();
      toast.success(
        `موجودی بازسازی شد: ${fmt(result.updated)} اصلاح، ${fmt(result.created)} ایجاد، ${fmt(result.zeroed)} صفر`,
      );
      setOpen(false);
      onRebuilt();
    } catch (error) {
      handleApiError(error, "خطا در بازسازی موجودی");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Button
        onClick={openAndPreview}
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 text-xs"
      >
        <Wrench size={14} />
        <span className="hidden sm:inline">بازسازی موجودی</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !applying && setOpen(o)}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>بازسازی موجودی از روی تراکنش‌ها</DialogTitle>
            <DialogDescription>
              موجودی هر کالا برابر جمع تراکنش‌های ثبت‌شده آن قرار می‌گیرد.
              مقدار رزرو تغییر نمی‌کند.
            </DialogDescription>
          </DialogHeader>

          {loading || rows === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> در حال مقایسه
              موجودی‌ها...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-success" />
              موجودی همه کالاها با تراکنش‌ها مطابقت دارد.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {fmt(rows.length)} ردیف موجودی با تراکنش‌ها نمی‌خواند. پیش از
                  اعمال، از ثبت سند توسط کاربران دیگر جلوگیری کنید.
                </span>
              </div>
              <div className="max-h-[50vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>انبار</TableHead>
                      <TableHead>کالا</TableHead>
                      <TableHead className="text-left">موجودی فعلی</TableHead>
                      <TableHead className="text-left">موجودی صحیح</TableHead>
                      <TableHead className="text-left">اختلاف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow
                        key={`${r.warehouseId}-${r.productId}-${r.locationId}-${r.batchId}`}
                      >
                        <TableCell>{r.warehouseTitle}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.productCode}
                          </span>{" "}
                          {r.productName}
                        </TableCell>
                        <TableCell className="text-left tabular-nums">
                          {fmt(r.currentQuantity)}
                        </TableCell>
                        <TableCell className="text-left tabular-nums">
                          {fmt(r.expectedQuantity)}
                        </TableCell>
                        <TableCell
                          className={`text-left font-medium tabular-nums ${r.difference < 0 ? "text-destructive" : "text-success"}`}
                          dir="ltr"
                        >
                          {r.difference > 0 ? "+" : ""}
                          {fmt(r.difference)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={applying}
            >
              انصراف
            </Button>
            {rows && rows.length > 0 && (
              <Button onClick={apply} disabled={applying}>
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `اعمال ${fmt(rows.length)} اصلاح`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
