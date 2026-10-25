"use client";

import React from "react";
import { ShieldX } from "lucide-react";
import { usePermissions } from "@/providers/PermissionProvider";
import { StatusMessage } from "@/components/ui/StatusMessage";

interface ProtectedPageProps {
  children: React.ReactNode;
  /** مجوز لازم برای دیدن صفحه */
  permission: string;
}

/** صفحه را فقط برای کاربر دارای مجوز نمایش می‌دهد؛ در غیر این صورت پیام فارسی عدم دسترسی */
const ProtectedPage = ({ children, permission }: ProtectedPageProps) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return (
      <StatusMessage
        icon={ShieldX}
        tone="warning"
        title="دسترسی به این صفحه ندارید"
        description="اگر برای کارتان به این بخش نیاز دارید، از مدیر سیستم بخواهید دسترسی لازم را به نقش شما اضافه کند."
        detail={`مجوز لازم: ${permission}`}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedPage;
