"use client";

import { Suspense } from "react";
import SidebarItem from "./SidebarItem";
import { MenuItem } from "@/config/menuItems";

interface Props {
  item: MenuItem;
  isCollapsed: boolean;
  level?: number;
  onCollapsedIconClick?: () => void;
  // تغییر: اضافه کردن پراپ جدید
  onItemClick?: () => void;
}

export default function SidebarItemWrapper({
  item,
  isCollapsed,
  level = 0,
  onCollapsedIconClick,
  onItemClick, // دریافت پراپ
}: Props) {
  return (
    <Suspense fallback={null}>
      <SidebarItem
        item={item}
        isCollapsed={isCollapsed}
        level={level}
        onCollapsedIconClick={onCollapsedIconClick}
        // تغییر: ارسال پراپ به فرزند
        onItemClick={onItemClick}
      />
    </Suspense>
  );
}
