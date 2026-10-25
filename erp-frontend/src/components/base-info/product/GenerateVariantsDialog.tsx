"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { productAttributeService, productService } from "@/services/baseInfoService";
import { handleApiError } from "@/lib/error-handling";
import type { ProductAttributeDto } from "@/types/api";

interface Props {
  productId: number;
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

/** انتخاب مقادیر ویژگی‌ها؛ برای هر ترکیب یک کالای تنوع ساخته می‌شود */
export default function GenerateVariantsDialog({ productId, open, onClose, onGenerated }: Props) {
  const [attributes, setAttributes] = useState<ProductAttributeDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setLoading(true);
    productAttributeService
      .lookup()
      .then(setAttributes)
      .catch((error) => handleApiError(error, "خطا در دریافت ویژگی‌های کالا"))
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const counts = attributes
    .map((a) => a.values.filter((v) => selected.includes(v.id)).length)
    .filter((n) => n > 0);
  const combinations = counts.length ? counts.reduce((a, b) => a * b, 1) : 0;

  const submit = async () => {
    setSubmitting(true);
    try {
      const created = await productService.generateVariants(productId, selected);
      toast.success(created > 0 ? `${created} تنوع ساخته شد` : "تنوع جدیدی ساخته نشد؛ همه ترکیب‌ها از قبل وجود دارند");
      onGenerated();
      onClose();
    } catch (error) {
      handleApiError(error, "خطا در ساخت تنوع کالا");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ساخت تنوع کالا
          </DialogTitle>
          <DialogDescription>
            از هر ویژگی مقادیر مورد نظر را انتخاب کنید. برای هر ترکیب یک کالای مستقل با
            واحد، گروه و ضرایب همین کالا ساخته می‌شود و ترکیب‌های موجود تکرار نمی‌شوند.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : attributes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              هنوز ویژگی فعالی تعریف نشده است.
            </p>
          ) : (
            attributes.map((a) => (
              <fieldset key={a.id} className="rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">{a.title}</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {a.values.map((v) => {
                    const id = `variant-value-${v.id}`;
                    return (
                      <div key={v.id} className="flex items-center gap-1.5">
                        <Checkbox
                          id={id}
                          checked={selected.includes(v.id)}
                          onCheckedChange={(c) => toggle(v.id, c === true)}
                        />
                        <Label htmlFor={id} className="cursor-pointer font-normal">
                          {v.title}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {combinations > 0 ? `${combinations} ترکیب` : "مقداری انتخاب نشده"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              انصراف
            </Button>
            <Button onClick={submit} disabled={submitting || combinations === 0}>
              {submitting && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
              ساخت تنوع‌ها
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
