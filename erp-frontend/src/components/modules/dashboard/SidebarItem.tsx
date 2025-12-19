"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MenuItem } from "@/config/menuItems";
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";
import { clsx } from "clsx";

interface Props {
  item: MenuItem;
  isCollapsed: boolean;
  level?: number;
  onCollapsedIconClick?: () => void;
  // تغییر: اضافه کردن پراپ
  onItemClick?: () => void;
}

export default function SidebarItem({
  item,
  isCollapsed,
  level = 0,
  onCollapsedIconClick,
  onItemClick, // دریافت پراپ
}: Props) {
  if (!item) return null;

  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { addTab } = useTabs();
  const [isOpen, setIsOpen] = useState(false);

  const hasDirectAccess = item.permission
    ? hasPermission(item.permission)
    : true;
  const hasChildAccess = item.submenu?.some((sub) =>
    sub && sub.permission ? hasPermission(sub.permission) : true
  );
  const isVisible = item.submenu
    ? hasDirectAccess || hasChildAccess
    : hasDirectAccess;

  if (!isVisible) return null;

  const isActive =
    item.href === pathname ||
    item.submenu?.some((sub) => sub?.href === pathname);

  const handleClick = (e: React.MouseEvent) => {
    if (item.href) {
      e.preventDefault();
      addTab(item.title, item.href);

      // تغییر: بستن سایدبار بعد از کلیک روی لینک
      if (onItemClick) {
        onItemClick();
      }
    }
  };

  const getLevelColors = () => {
    const colors = [
      // سطح 0
      {
        bg: "bg-gradient-to-r from-emerald-50 to-emerald-100/50",
        bgHover: "hover:from-emerald-100 hover:to-emerald-200/60",
        text: "text-emerald-700",
        textActive: "text-emerald-900",
        bgActive:
          "bg-gradient-to-r from-emerald-100 to-emerald-200/70 shadow-sm ring-1 ring-emerald-300/50",
        icon: "text-emerald-600",
      },
      // سطح 1
      {
        bg: "bg-blue-50/70",
        bgHover: "hover:bg-blue-100/80",
        text: "text-blue-700",
        textActive: "text-blue-900",
        bgActive: "bg-blue-100/90 shadow-sm",
        icon: "text-blue-600",
      },
      // سطح 2
      {
        bg: "bg-purple-50/70",
        bgHover: "hover:bg-purple-100/80",
        text: "text-purple-700",
        textActive: "text-purple-900",
        bgActive: "bg-purple-100/90 shadow-sm",
        icon: "text-purple-600",
      },
      // سطح 3
      {
        bg: "bg-pink-50/70",
        bgHover: "hover:bg-pink-100/80",
        text: "text-pink-700",
        textActive: "text-pink-900",
        bgActive: "bg-pink-100/90 shadow-sm",
        icon: "text-pink-600",
      },
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const colors = getLevelColors();
  const marginClass = level > 0 && !isCollapsed ? clsx(`mr-${level * 2}`) : "";

  // آیتم ساده (بدون زیرمنو)
  if (!item.submenu) {
    const handleItemClick = (e: React.MouseEvent) => {
      if (isCollapsed) {
        e.preventDefault();
        onCollapsedIconClick?.();
      } else {
        handleClick(e);
      }
    };

    return (
      <a
        href={item.href!}
        onClick={handleItemClick}
        className={clsx(
          "flex items-center gap-3 transition-all duration-200 cursor-pointer select-none text-sm font-medium group",
          isCollapsed
            ? "rounded-md px-1.5 py-2 justify-center"
            : "rounded-lg px-3 py-2.5 justify-start",
          marginClass,
          isActive
            ? clsx(colors.bgActive, colors.textActive, "font-semibold")
            : clsx(colors.bg, colors.bgHover, colors.text)
        )}
        title={isCollapsed ? item.title : ""}
      >
        <div
          className={clsx(
            "flex items-center justify-center w-5 h-5 rounded-md transition-all duration-200",
            isActive ? "scale-110" : "group-hover:scale-105",
            colors.icon
          )}
        >
          <item.icon size={18} className="shrink-0" />
        </div>
        {!isCollapsed && (
          <span className="truncate flex-1 text-right">{item.title}</span>
        )}
      </a>
    );
  }

  // منوی کشویی
  const handleMenuClick = (e: React.MouseEvent) => {
    if (isCollapsed && level === 0) {
      e.preventDefault();
      onCollapsedIconClick?.();
    } else if (isCollapsed && level > 0) {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={clsx("select-none", marginClass)}>
      <button
        onClick={handleMenuClick}
        className={clsx(
          "flex w-full items-center justify-between transition-all duration-200 cursor-pointer text-sm font-medium group",
          isCollapsed ? "rounded-md px-1.5 py-2" : "rounded-lg px-3 py-2.5",
          isActive
            ? clsx(colors.bgActive, colors.textActive, "font-semibold")
            : clsx(colors.bg, colors.bgHover, colors.text)
        )}
        title={isCollapsed ? item.title : ""}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={clsx(
              "flex items-center justify-center w-5 h-5 rounded-md transition-all duration-200 shrink-0",
              isActive ? "scale-110" : "group-hover:scale-105",
              colors.icon
            )}
          >
            <item.icon size={18} className="shrink-0" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-right">{item.title}</span>
          )}
        </div>

        {!isCollapsed && item.submenu && (
          <ChevronDown
            size={16}
            className={clsx(
              "transition-transform duration-300 shrink-0 ml-2",
              isOpen ? "rotate-180" : "",
              colors.text
            )}
          />
        )}
        {isCollapsed && level > 0 && item.submenu && (
          <ChevronDown
            size={16}
            className={clsx(
              "transition-transform duration-300 shrink-0 ml-2",
              isOpen ? "rotate-180" : "",
              colors.text
            )}
          />
        )}
      </button>

      {/* زیرمنو */}
      {item.submenu && (
        <div
          className={clsx(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div
            className={clsx(
              "pt-2 pb-1 space-y-1",
              !isCollapsed && "border-r-2 border-emerald-200/40 mr-2 pr-0",
              isCollapsed && "space-y-0.5"
            )}
          >
            {item.submenu.map((sub, index) => (
              <SidebarItem
                key={index}
                item={sub}
                isCollapsed={isCollapsed}
                level={isCollapsed ? 0 : level + 1}
                onCollapsedIconClick={onCollapsedIconClick}
                // تغییر: پاس دادن onItemClick به صورت بازگشتی به فرزندان
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
