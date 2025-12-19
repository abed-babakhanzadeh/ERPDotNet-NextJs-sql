"use client";

import React, { useState } from "react";
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
import { Loader2, Copy } from "lucide-react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { useTabs } from "@/providers/TabsProvider";

interface NewVersionDialogProps {
  open: boolean;
  onClose: () => void;
  sourceBomId: number;
  sourceVersion: string;
  productName: string;
}

export default function NewVersionDialog({
  open,
  onClose,
  sourceBomId,
  sourceVersion,
  productName,
}: NewVersionDialogProps) {
  const { addTab } = useTabs();
  const [loading, setLoading] = useState(false);

  // محاسبه نسخه پیشنهادی (ساده: افزودن به عدد آخر)
  const suggestVersion = (ver: string) => {
    const parts = ver.split(".");
    if (parts.length > 0) {
      const last = parseInt(parts[parts.length - 1]);
      if (!isNaN(last)) {
        parts[parts.length - 1] = (last + 1).toString();
        return parts.join(".");
      }
    }
    return ver + ".1";
  };

  const [newVersion, setNewVersion] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // وقتی مودال باز می‌شود، مقادیر پیش‌فرض را ست کن
  React.useEffect(() => {
    if (open) {
      setNewVersion(suggestVersion(sourceVersion));
      setNewTitle(""); // یا عنوان قبلی را بگذارید
    }
  }, [open, sourceVersion]);

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion) return;

    setLoading(true);
    try {
      // ارسال درخواست به API
      const res = await apiClient.post(`/BOMs/${sourceBomId}/copy`, {
        sourceBomId: sourceBomId,
        newVersion: newVersion,
        newTitle: newTitle || undefined, // اگر خالی بود نفرست
      });

      const newId = res.data.id;
      toast.success(`نسخه ${newVersion} با موفقیت ایجاد شد`);
      onClose();

      // هدایت کاربر به صفحه ویرایشِ نسخه جدید
      addTab(
        `ویرایش BOM ${newVersion}`,
        `/product-engineering/boms/edit/${newId}`
      );
    } catch (error: any) {
      const msg = error.response?.data?.detail || "خطا در ایجاد نسخه جدید";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            ایجاد نسخه جدید (Revision)
          </DialogTitle>
          <DialogDescription>
            کپی از نسخه <b>{sourceVersion}</b> برای محصول <b>{productName}</b>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCopy} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              شماره نسخه جدید <span className="text-red-500">*</span>
            </Label>
            <Input
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="مثال: 1.2"
              className="font-mono dir-ltr text-left"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>عنوان جدید (اختیاری)</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="مثال: فرمول بهبود یافته تابستان"
            />
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
              disabled={loading}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              ایجاد نسخه جدید
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
