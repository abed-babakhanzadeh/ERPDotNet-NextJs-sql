"use client";

import { useEffect, useState } from "react";
import { Loader2, Timer } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { workflowService } from "@/services/workflowService";
import { handleApiError } from "@/lib/error-handling";
import type { StateDto, WorkflowRoleDto } from "@/types/workflow";

const NONE = "__none__";

interface Props {
  state: StateDto | null;
  roles: WorkflowRoleDto[];
  onClose: () => void;
  onSaved: () => void;
}

/** مهلت انجام مرحله و نقشی که پس از سررسید می‌تواند روی پرونده اقدام کند */
export default function StateSlaDialog({
  state,
  roles,
  onClose,
  onSaved,
}: Props) {
  const [hours, setHours] = useState("");
  const [roleId, setRoleId] = useState(NONE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state) return;
    setHours(state.slaHours ? String(state.slaHours) : "");
    setRoleId(state.escalationRoleId ?? NONE);
  }, [state]);

  const slaHours = hours.trim() ? Number(hours) : null;
  const invalid =
    slaHours !== null && (!Number.isInteger(slaHours) || slaHours < 1);

  const submit = async () => {
    if (!state) return;
    setSubmitting(true);
    try {
      await workflowService.updateStateSla(state.id, {
        id: state.id,
        slaHours,
        escalationRoleId: slaHours && roleId !== NONE ? roleId : null,
      });
      toast.success("سررسید مرحله ذخیره شد");
      onSaved();
    } catch (error) {
      handleApiError(error, "خطا در ذخیره سررسید");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            سررسید مرحله «{state?.title}»
          </DialogTitle>
          <DialogDescription>
            کارهای این مرحله از لحظه ورود به کارتابل این مقدار مهلت دارند. پس از
            سررسید، نقش ارجاع هم می‌تواند روی پرونده اقدام کند. تغییر فقط روی
            کارهای جدید اثر دارد.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="sla-hours">مهلت انجام (ساعت)</Label>
            <Input
              id="sla-hours"
              type="number"
              min={1}
              dir="ltr"
              className="text-left font-mono"
              placeholder="خالی = بدون سررسید"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>ارجاع پس از سررسید به نقش</Label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={!slaHours}
            >
              <SelectTrigger dir="rtl" aria-label="نقش ارجاع">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value={NONE} className="text-muted-foreground">
                  بدون ارجاع
                </SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={submitting || invalid}>
            {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
            ذخیره سررسید
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
