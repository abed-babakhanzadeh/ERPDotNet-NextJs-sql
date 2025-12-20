"use client";

import { useState } from "react";
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
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface ResetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string | number;
  username: string;
}

export default function ResetPasswordDialog({
  open,
  onClose,
  userId,
  username,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("تکرار رمز عبور مطابقت ندارد");
      return;
    }

    setLoading(true);
    try {
      // این اندپوینت باید در بک‌اند ساخته شود:
      // [HttpPost("admin-reset-password")]
      await apiClient.post(`/Users/${userId}/change-password`, {
        newPassword: password,
      });

      toast.success(`رمز عبور کاربر ${username} با موفقیت تغییر کرد`);
      onClose();
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "خطا در تغییر رمز عبور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <KeyRound className="w-5 h-5" />
            تغییر رمز عبور
          </DialogTitle>
          <DialogDescription>
            تنظیم رمز عبور جدید برای کاربر <strong>{username}</strong>.
            <br />
            <span className="text-xs text-muted-foreground">
              (کاربر پس از این تغییر باید با رمز جدید وارد شود)
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2 relative">
            <Label>رمز عبور جدید</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dir-ltr text-left pr-8"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>تکرار رمز عبور</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="dir-ltr text-left"
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
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "تغییر رمز"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
