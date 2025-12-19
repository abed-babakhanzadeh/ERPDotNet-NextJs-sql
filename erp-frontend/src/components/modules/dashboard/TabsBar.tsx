"use client";

import { useTabs } from "@/providers/TabsProvider";
import { X, Home, Plus } from "lucide-react";
import { clsx } from "clsx";
import React, { useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// مموایز کردن آیتم تب برای جلوگیری از رندر غیر ضروری
const TabItem = memo(function TabItem({
  tab,
  isActive,
  onSetActive,
  onClose,
  showClose,
}: {
  tab: { id: string; title: string; url: string };
  isActive: boolean;
  onSetActive: (id: string) => void;
  onClose: (id: string) => void;
  showClose: boolean;
}) {
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle click (button 1) = بستن تب
    if (e.button === 1) {
      e.preventDefault();
      onClose(tab.id);
    }
    // Left click (button 0) = فعال‌کردن تب
    else if (e.button === 0) {
      onSetActive(tab.id);
    }
  };

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <div
      className={clsx(
        "group flex items-center gap-1 px-2 h-10 text-[12px] font-medium rounded-t",
        "transition-all duration-200 cursor-pointer min-w-fit max-w-[180px] select-none",
        "relative border-2",
        "hover:bg-accent/50",
        isActive
          ? "text-foreground bg-card border-b-primary shadow-sm"
          : "text-muted-foreground border-b-transparent hover:text-foreground"
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Tab Title */}
      <span className="truncate flex-1">{tab.title}</span>

      {/* Close Button */}
      {showClose && (
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={handleCloseClick}
          className={clsx(
            "h-4 w-4 p-0 rounded transition-all duration-150",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-destructive/20 hover:text-destructive"
          )}
          title="بستن تب (یا Middle Click)"
        >
          <X size={15} />
        </Button>
      )}
    </div>
  );
});

export default function TabsBar() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabs();

  const handleSetActive = useCallback(
    (id: string) => {
      setActiveTab(id);
    },
    [setActiveTab]
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      closeTab(id);
    },
    [closeTab]
  );

  const handleHomeClick = useCallback(() => {
    setActiveTab("/");
  }, [setActiveTab]);

  if (tabs.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center border-b border-border bg-background/95 backdrop-blur-sm h-7 px-2">
      {/* Home/Dashboard Tab - سمت راست */}
      <button
        onClick={handleHomeClick}
        className={clsx(
          "flex items-center gap-1 px-2 h-6 text-[11px] font-medium rounded-t shrink-0",
          "transition-all duration-200 select-none border-b-2 ml-1",
          "hover:bg-accent/50",
          activeTabId === "/"
            ? "text-foreground bg-card border-b-primary shadow-sm"
            : "text-muted-foreground border-b-transparent hover:text-foreground"
        )}
      >
        <Home size={12} />
        <span className="hidden sm:inline">پیشخوان</span>
      </button>

      {/* Scrollable Tabs - وسط (راست‌چین) */}
      <ScrollArea className="flex-1" dir="rtl">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSetActive={handleSetActive}
              onClose={handleCloseTab}
              showClose={tabs.length > 1}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>

      {/* Add New Tab Button - سمت چپ */}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded hover:bg-accent/80 transition-colors shrink-0 mr-1"
        title="تب جدید"
      >
        <Plus size={11} />
      </Button>
    </div>
  );
}
