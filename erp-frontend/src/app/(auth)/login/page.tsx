"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/userAccessService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { handleApiError } from "@/lib/error-handling";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.login({
        username: formData.username,
        password: formData.password,
      });

      toast.success("خوش آمدید!", {
        description: "ورود شما با موفقیت انجام شد.",
      });

      // 3. هدایت به داشبورد
      // استفاده از replace به جای push تا کاربر با دکمه Back به لاگین برنگردد
      router.replace("/");
    } catch (error) {
      handleApiError(error, "ورود انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-xl">
        <div className="bg-primary p-8 text-center">
          <h1 className="text-3xl font-bold text-primary-foreground">ERP DotNet</h1>
          <p className="mt-2 text-primary-foreground/80">سیستم مدیریت منابع سازمانی</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="mb-2 block">
                نام کاربری
              </Label>
              <Input
                id="username"
                type="text"
                required
                autoComplete="username"
                dir="ltr"
                autoFocus
                placeholder="admin"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block">
                رمز عبور
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  در حال ورود...
                </>
              ) : (
                "ورود به سیستم"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
