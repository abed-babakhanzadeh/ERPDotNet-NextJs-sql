"use client";

import React from "react";
import { usePermissions } from "@/providers/PermissionProvider";

interface PermissionGuardProps {
  children: React.ReactNode;
  /** نام مجوز، همان رشته‌ای که بک‌اند در HasPermission بررسی می‌کند */
  permission: string;
  /** آنچه به کاربر بدون مجوز نمایش داده می‌شود (پیش‌فرض: هیچ) */
  fallback?: React.ReactNode;
}

/**
 * فقط وقتی کاربر مجوز دارد محتوا (معمولاً دکمه یا بخشی از صفحه) را نمایش می‌دهد.
 * بررسی اصلی همیشه در API است؛ این کامپوننت فقط چیزی را که کاربر نمی‌تواند انجام دهد نشان نمی‌دهد.
 */
const PermissionGuard = ({ children, permission, fallback = null }: PermissionGuardProps) => {
  const { hasPermission } = usePermissions();
  return <>{hasPermission(permission) ? children : fallback}</>;
};

export default PermissionGuard;
