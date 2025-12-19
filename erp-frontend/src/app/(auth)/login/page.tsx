"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
      // 1. ارسال درخواست به بک‌اند
      // نکته: آدرس دقیق کنترلر AuthController است
      const { data } = await apiClient.post("/Auth/login", {
        username: formData.username,
        password: formData.password,
      });

      // 2. ذخیره توکن (نکته حیاتی: نام کلید باید با apiClient یکی باشد)
      // اگر در apiClient.ts از "token" استفاده کردید، اینجا هم باید "token" باشد.
      // اگر بک‌اند آبجکت { token: "..." } برمی‌گرداند:
      localStorage.setItem("accessToken", data.token);

      toast.success("خوش آمدید!", {
        description: "ورود شما با موفقیت انجام شد.",
      });

      // 3. هدایت به داشبورد
      // استفاده از replace به جای push تا کاربر با دکمه Back به لاگین برنگردد
      router.replace("/");
    } catch (error: any) {
      console.error("Login Error:", error);

      // هندلینگ پیام خطای بک‌اند (چه فرمت استاندارد ProblemDetails چه پیام ساده)
      const errorMsg =
        error.response?.data?.detail || // فرمت جدید .NET 8
        error.response?.data?.message || // اگر دستی مسیج دادیم
        error.response?.data || // اگر رشته خالی فرستادیم
        "نام کاربری یا رمز عبور اشتباه است.";

      toast.error("خطا در ورود", {
        description:
          typeof errorMsg === "string" ? errorMsg : "مشکلی پیش آمده است.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white">ERP DotNet</h1>
          <p className="mt-2 text-blue-100">سیستم مدیریت منابع سازمانی</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                نام کاربری
              </label>
              <input
                type="text"
                required
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                placeholder="admin"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                رمز عبور
              </label>
              <input
                type="password"
                required
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
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
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
    </div>
  );
}
