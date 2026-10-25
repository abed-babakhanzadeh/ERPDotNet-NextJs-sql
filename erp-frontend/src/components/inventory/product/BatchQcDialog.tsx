"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import {
  BatchQcStatus,
  BatchQcStatusMap,
  InventoryBatchDto,
} from "@/types/inventory";

interface Props {
  batch: InventoryBatchDto | null;
  onClose: () => void;
  onSaved: () => void;
}

/** ثبت نتیجهٔ کنترل کیفیت بچ؛ فقط بچ «تأیید شده» در حواله‌های عادی قابل خروج است */
export default function BatchQcDialog({ batch, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!batch) return;
    setStatus(String(batch.qcStatus));
    setNote(batch.qcNote ?? "");
  }, [batch]);

  const rejected = Number(status) === BatchQcStatus.Rejected;

  const submit = async () => {
    if (!batch) return;
    setSubmitting(true);
    try {
      await inventoryService.setBatchQc(batch.id, {
        id: batch.id,
        qcStatus: Number(status) as BatchQcStatus,
        note: note.trim() || null,
      });
      toast.success("وضعیت کنترل کیفیت ثبت شد");
      onSaved();
    } catch (error) {
      handleApiError(error, "خطا در ثبت کنترل کیفیت");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!batch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            کنترل کیفیت بچ {batch?.batchNumber}
          </DialogTitle>
          <DialogDescription>
            بچ قرنطینه یا مردود در حواله‌های عادی قابل خروج نیست؛ فقط انواع
            سندی که مجوز خروج بچ تأییدنشده دارند (مثل برگشت به تأمین‌کننده)
            آن را می‌پذیرند.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>نتیجهٔ کنترل کیفیت</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="نتیجهٔ کنترل کیفیت">
                <SelectValue placeholder="انتخاب وضعیت" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BatchQcStatusMap).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-note">
              یادداشت QC{" "}
              {rejected && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="qc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={rejected ? "دلیل مردودی الزامی است" : "اختیاری"}
            />
          </div>
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
          <Button
            onClick={submit}
            disabled={submitting || !status || (rejected && !note.trim())}
          >
            {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
            ثبت نتیجه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
