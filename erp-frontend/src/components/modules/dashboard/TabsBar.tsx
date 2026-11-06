"use client";

import { HOME_PATH, useTabs, type Tab } from "@/providers/TabsProvider";
import { X, Home } from "lucide-react";
import { clsx } from "clsx";
import React, { memo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabLauncher } from "./TabLauncher";

// سبک «تب جدا با خط رنگی بالا»: جداکننده عمودی بین تب‌ها، تب فعال هم‌رنگ محتوا با خط بالای primary
const tabBaseClass = clsx(
  "group relative flex h-9 shrink-0 select-none items-center gap-1 border-l border-border ps-3 pe-1.5 text-xs",
  "cursor-pointer transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
);

const tabStateClass = (isActive: boolean) =>
  isActive
    ? "bg-card font-medium text-foreground shadow-[inset_0_2px_0_hsl(var(--primary))]"
    : "text-muted-foreground hover:bg-card/60 hover:text-foreground";

// مموایز کردن آیتم تب برای جلوگیری از رندر غیر ضروری
const TabItem = memo(function TabItem({
  tab,
  isActive,
  onSetActive,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  onSetActive: (id: string) => void;
  onClose: (id: string) => void;
}) {
  // Middle click = بستن تب (روی mousedown تا اسکرول خودکار مرورگر شروع نشود)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(tab.id);
    }
  };

  // Enter/Space = فعال‌سازی، Delete = بستن
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSetActive(tab.id);
    } else if (e.key === "Delete") {
      e.preventDefault();
      onClose(tab.id);
    }
  };

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      title={tab.title}
      className={clsx(tabBaseClass, tabStateClass(isActive), "max-w-[200px]")}
      onMouseDown={handleMouseDown}
      onClick={() => onSetActive(tab.id)}
      onKeyDown={handleKeyDown}
    >
      <span className="truncate">{tab.title}</span>
      <button
        type="button"
        tabIndex={-1}
        // نام ثابت؛ عنوان تب در خود تب (والد) هست. تکرار عنوان در نام دکمه باعث تداخل با
        // دکمه‌های هم‌نام صفحه می‌شد (مثلاً «حواله مواد» و «بستن حواله مواد …»)
        aria-label="بستن تب"
        title={`بستن «${tab.title}» (Delete یا کلیک وسط)`}
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
        // ناحیه کلیک ۲۴×۲۴ (حداقل WCAG 2.2) با آیکون ۱۲px
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity",
          "hover:bg-destructive/15 hover:text-destructive hover:opacity-100",
          isActive ? "opacity-70" : "opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70",
        )}
      >
        <X size={12} />
      </button>
    </div>
  );
});

export default function TabsBar() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabs();

  return (
    <div className="flex h-9 items-stretch bg-muted/60" role="tablist" aria-label="صفحه‌های باز">
      {/* پیشخوان: تب ثابت و غیرقابل بستن؛ بعد از بستن آخرین تب، کاربر اینجا برمی‌گردد */}
      <button
        type="button"
        role="tab"
        aria-selected={activeTabId === HOME_PATH}
        aria-label="پیشخوان"
        title="پیشخوان"
        onClick={() => setActiveTab(HOME_PATH)}
        className={clsx(tabBaseClass, "px-3", tabStateClass(activeTabId === HOME_PATH))}
      >
        <Home size={14} />
      </button>

      <ScrollArea className="min-w-0 flex-1" dir="rtl">
        <div className="flex h-9 items-stretch">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSetActive={setActiveTab}
              onClose={closeTab}
            />
          ))}
          {/* دکمه + بلافاصله بعد از آخرین تب */}
          <div className="flex items-center px-1.5">
            <TabLauncher />
          </div>
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
