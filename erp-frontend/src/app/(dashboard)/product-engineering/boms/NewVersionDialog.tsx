"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTabs } from "@/providers/TabsProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleApiError } from "@/lib/error-handling";
import { bomService } from "@/services/bomService";

interface NewVersionDialogProps {
  open: boolean;
  onClose: () => void;
  sourceBomId: number;
  sourceVersion: number; // اصلاح شد: number
  sourceProductId: number; // اضافه شد: برای گرفتن ورژن بعدی
  productName: string;
}

export default function NewVersionDialog({
  open,
  onClose,
  sourceBomId,
  sourceVersion,
  sourceProductId,
  productName,
}: NewVersionDialogProps) {
  const { addTab } = useTabs();
  const [loading, setLoading] = useState(false);
  const [fetchingVersion, setFetchingVersion] = useState(false);

  // State
  const [newVersion, setNewVersion] = useState<number>(0);
  const [newTitle, setNewTitle] = useState("");
  const [targetUsage, setTargetUsage] = useState<number>(1); // 1=Main, 2=Alternate

  // دریافت نسخه پیشنهادی از سرور به محض باز شدن مودال
  useEffect(() => {
    if (open && sourceProductId) {
      fetchNextVersion();
    }
  }, [open, sourceProductId]);

  const fetchNextVersion = async () => {
    setFetchingVersion(true);
    try {
      setNewVersion(await bomService.getNextVersion(sourceProductId));
      setNewTitle(""); // پاک کردن عنوان قبلی یا گذاشتن مقدار پیش‌فرض
    } catch (error) {
      console.error(error);
      // در صورت خطا، یک واحد به نسخه قبلی اضافه می‌کنیم (Fallback)
      setNewVersion(sourceVersion + 1);
    } finally {
      setFetchingVersion(false);
    }
  };

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || newVersion <= 0) {
      toast.error("شماره نسخه نامعتبر است");
      return;
    }

    setLoading(true);
    try {
      const newId = await bomService.copy({
        sourceBomId: sourceBomId,
        newVersion: Number(newVersion), // int
        newTitle: newTitle || undefined,
        targetUsage: targetUsage, // 1 or 2
        isActive: true,
      });

      toast.success(`نسخه ${newVersion} با موفقیت ایجاد شد`);
      onClose();

      // هدایت کاربر به صفحه ویرایشِ نسخه جدید
      addTab(
        `ویرایش BOM v${newVersion}`,
        `/product-engineering/boms/edit/${newId}`
      );
    } catch (error) {
      handleApiError(error, "خطا در ایجاد نسخه جدید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            ایجاد نسخه جدید (Revision)
          </DialogTitle>
          <DialogDescription>
            کپی از نسخه <b>{sourceVersion}</b> برای کالا/قلم{" "}
            <b>{productName}</b>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCopy} className="space-y-5 py-2">
          {/* انتخاب نوع کاربرد (Usage) */}
          <div className="space-y-3 border p-3 rounded-md bg-muted">
            <Label className="text-sm font-medium">نوع فرمول جدید:</Label>
            <RadioGroup
              value={targetUsage.toString()}
              onValueChange={(v) => setTargetUsage(Number(v))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="1" id="u-main" />
                <Label htmlFor="u-main" className="cursor-pointer text-sm">
                  فرمول اصلی (Main)
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="2" id="u-alt" />
                <Label htmlFor="u-alt" className="cursor-pointer text-sm">
                  فرمول فرعی (Alternate)
                </Label>
              </div>
            </RadioGroup>

            {targetUsage === 1 && (
              <Alert
                variant="default"
                className="bg-warning/10 border-warning/30 text-warning py-2 mt-2"
              >
                <AlertTriangle className="h-4 w-4 text-warning ml-2" />
                <AlertDescription className="text-xs leading-5">
                  توجه: هر کالا فقط می‌تواند <b>یک</b> فرمول اصلیِ فعال داشته
                  باشد.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label>شماره نسخه (Next)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={newVersion}
                  onChange={(e) => setNewVersion(Number(e.target.value))}
                  className="font-mono dir-ltr text-center pl-8"
                  required
                  min={1}
                  disabled={fetchingVersion}
                />
                {fetchingVersion && (
                  <div className="absolute left-2 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>عنوان جدید</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان اختیاری..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={loading || fetchingVersion}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              ایجاد نسخه
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
