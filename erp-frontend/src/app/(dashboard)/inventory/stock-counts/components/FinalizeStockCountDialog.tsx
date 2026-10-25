"use client";

import { useEffect, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import { InventoryNature } from "@/types/inventory";
import type { StockCountDto } from "@/types/api";

interface Props {
  open: boolean;
  stockCount: StockCountDto;
  onClose: () => void;
  onFinalized: () => void;
}

/** نهایی کردن: اضافی‌ها با یک سند وارده و کسری‌ها با یک سند صادره (هر دو پیش‌نویس) اصلاح می‌شوند */
export default function FinalizeStockCountDialog({
  open,
  stockCount,
  onClose,
  onFinalized,
}: Props) {
  const [docTypes, setDocTypes] = useState<
    { id: number; title: string; natureValue: number }[]
  >([]);
  const [surplusType, setSurplusType] = useState<string>("");
  const [shortageType, setShortageType] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    inventoryService
      .getAllDocTypes()
      .then((res: any) =>
        setDocTypes(Array.isArray(res) ? res : (res?.items ?? [])),
      )
      .catch((error) => handleApiError(error, "خطا در دریافت انواع سند"));
  }, [open]);

  const diffs = stockCount.lines.map(
    (l) => (l.countedQuantity ?? l.systemQuantity) - l.systemQuantity,
  );
  const surplusLines = diffs.filter((d) => d > 0).length;
  const shortageLines = diffs.filter((d) => d < 0).length;
  const uncounted = stockCount.lines.filter(
    (l) => l.countedQuantity == null,
  ).length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await inventoryService.finalizeStockCount(stockCount.id, {
        id: stockCount.id,
        surplusDocTypeId: surplusType ? Number(surplusType) : null,
        shortageDocTypeId: shortageType ? Number(shortageType) : null,
      });
      toast.success(
        res.surplusDocId || res.shortageDocId
          ? "انبارگردانی نهایی شد و اسناد اصلاحی پیش‌نویس ساخته شدند"
          : "انبارگردانی بدون اختلاف نهایی شد",
      );
      onFinalized();
    } catch (error) {
      handleApiError(error, "خطا در نهایی کردن انبارگردانی");
    } finally {
      setSubmitting(false);
    }
  };

  const typeSelect = (
    label: string,
    nature: InventoryNature,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="انتخاب نوع سند" />
        </SelectTrigger>
        <SelectContent>
          {docTypes
            .filter((t) => t.natureValue === nature)
            .map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.title}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-primary" />
            نهایی کردن انبارگردانی
          </DialogTitle>
          <DialogDescription>
            {uncounted > 0
              ? `${uncounted} سطر هنوز شمرده نشده است؛ پیش از نهایی کردن، شمارش همه سطرها (حتی صفر) لازم است.`
              : `${surplusLines} سطر اضافی و ${shortageLines} سطر کسری. اسناد اصلاحی پیش‌نویس ساخته می‌شوند و مثل هر سند دیگر تأیید و قطعی می‌شوند.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {surplusLines > 0 &&
            typeSelect(
              "نوع سند اضافی (وارده)",
              InventoryNature.Input,
              surplusType,
              setSurplusType,
            )}
          {shortageLines > 0 &&
            typeSelect(
              "نوع سند کسری (صادره)",
              InventoryNature.Output,
              shortageType,
              setShortageType,
            )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button onClick={submit} disabled={submitting || uncounted > 0}>
            {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
            نهایی کردن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
