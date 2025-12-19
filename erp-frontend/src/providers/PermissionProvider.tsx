"use client";

import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

interface PermissionContextType {
  permissions: string[];
  loading: boolean;
  hasPermission: (permissionName: string) => boolean;
  hasPermissionGroup: (prefix: string) => boolean; // <--- تابع جدید
}
const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

export const PermissionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname(); // <--- دریافت آدرس فعلی

  useEffect(() => {
    const fetchPermissions = async () => {
      // 1. اگر در صفحه لاگین هستیم، اصلاً درخواست نزن
      if (pathname === "/login") {
        setLoading(false);
        return;
      }

      // 2. چک کردن وجود توکن
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setPermissions([]);
        setLoading(false);
        return; // <--- حیاتی: ریترن کن تا درخواست ارسال نشود
      }

      try {
        const { data } = await apiClient.get<string[]>("/Permissions/mine"); // آدرس را چک کن
        setPermissions(data);
      } catch (error) {
        // حتی اگر ارور داد، ما لودینگ را فالس میکنیم که صفحه بالا بیاید
        console.error("خطا در دریافت مجوزها", error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [pathname]); // <--- وابستگی به pathname اضافه شود

  // تابع کمکی برای چک کردن دسترسی
  const hasPermission = (permissionName: string) => {
    return permissions.includes(permissionName);
  };

  // === تابع جدید: چک کردن گروهی ===
  // مثال: اگر ورودی "UserAccess" باشد، و کاربر "UserAccess.View" داشته باشد، True برمی‌گرداند.
  const hasPermissionGroup = (prefix: string) => {
    return permissions.some((p) => p === prefix || p.startsWith(prefix + "."));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">در حال دریافت مجوزها...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionContext.Provider
      value={{ permissions, loading, hasPermission, hasPermissionGroup }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

// هوک اختصاصی برای استفاده راحت‌تر
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};
