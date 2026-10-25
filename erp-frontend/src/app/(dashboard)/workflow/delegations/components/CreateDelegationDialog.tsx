"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserCheck } from "lucide-react";
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
import { Form } from "@/components/ui/form";
import {
  DateField,
  SelectField,
  TextareaField,
} from "@/components/form/fields";
import { workflowService } from "@/services/workflowService";
import { handleApiError } from "@/lib/error-handling";
import type { DelegateUserDto } from "@/types/api";

const schema = z
  .object({
    toUserId: z
      .string({ message: "گیرنده را انتخاب کنید" })
      .min(1, "گیرنده را انتخاب کنید"),
    startDate: z.string({ message: "تاریخ شروع را وارد کنید" }).min(1),
    endDate: z.string({ message: "تاریخ پایان را وارد کنید" }).min(1),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    path: ["endDate"],
    message: "پایان بازه نمی‌تواند پیش از شروع آن باشد",
  });
type Values = z.infer<typeof schema>;

// بازه روزانه است: از ابتدای روز شروع تا پایان روز پایان (به وقت محلی)
const startOfDay = (iso: string) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const endOfDay = (iso: string) => {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** سپردن اختیار کارتابل به همکار برای یک بازه (مثلاً مرخصی) */
export default function CreateDelegationDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const [users, setUsers] = useState<DelegateUserDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      toUserId: "",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 864e5).toISOString(),
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    workflowService
      .getDelegateUsers()
      .then(setUsers)
      .catch((error) => handleApiError(error, "خطا در دریافت فهرست همکاران"));
  }, [open]);

  const submit = async (values: Values) => {
    setSubmitting(true);
    try {
      await workflowService.createDelegation({
        toUserId: values.toUserId,
        startDate: startOfDay(values.startDate),
        endDate: endOfDay(values.endDate),
        reason: values.reason || null,
      });
      toast.success("تفویض اختیار ثبت شد");
      form.reset();
      onCreated();
    } catch (error) {
      handleApiError(error, "خطا در ثبت تفویض");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            تفویض اختیار جدید
          </DialogTitle>
          <DialogDescription>
            در این بازه، گیرنده با نقش‌های شما کارهای کارتابل را می‌بیند و روی
            آن‌ها اقدام می‌کند؛ در تاریخچه پرونده «از طرف شما» ثبت می‌شود.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
            <SelectField
              control={form.control}
              name="toUserId"
              label="گیرنده تفویض"
              required
              placeholder="انتخاب همکار"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.fullName || u.userName} (${u.userName})`,
              }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <DateField
                control={form.control}
                name="startDate"
                label="از تاریخ"
                required
              />
              <DateField
                control={form.control}
                name="endDate"
                label="تا تاریخ"
                required
              />
            </div>
            <TextareaField
              control={form.control}
              name="reason"
              label="دلیل"
              placeholder="مثلاً مرخصی یا مأموریت"
              rows={2}
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
                ثبت تفویض
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
