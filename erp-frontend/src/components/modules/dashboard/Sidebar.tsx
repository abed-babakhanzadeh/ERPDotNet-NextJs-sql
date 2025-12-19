"use client";

import { X, Menu, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { MENU_ITEMS } from "@/config/menuItems";
import SidebarItemWrapper from "./SidebarItemWrapper";
import { usePermissions } from "@/providers/PermissionProvider";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  toggleCollapse,
}: SidebarProps) {
  const { loading } = usePermissions();

  return (
    <>
      {/* Overlay موبایل */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity md:hidden"
        />
      )}

      <aside
        className={clsx(
          "fixed right-0 top-0 z-[60] h-screen border-l border-border bg-card transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-16" : "md:w-64",
          "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-12 items-center border-b border-border bg-primary px-2 justify-between gap-2">
          <button
            onClick={toggleCollapse}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground transition-all duration-200 hover:scale-110 order-last"
            title={isCollapsed ? "باز کردن" : "بستن"}
          >
            {isCollapsed ? (
              <Menu size={13} className="stroke-[2.5]" />
            ) : (
              <ChevronRight size={13} className="stroke-[2.5]" />
            )}
          </button>

          <div className="flex items-center gap-1.5 flex-1">
            {isCollapsed ? (
              <div className="h-5 w-5 rounded bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">
                  E
                </span>
              </div>
            ) : (
              <>
                <div className="h-5 w-5 rounded bg-primary-foreground/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">
                    E
                  </span>
                </div>
                <h1 className="text-[11px] font-bold text-primary-foreground whitespace-nowrap">
                  سامانه ERP
                </h1>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-primary-foreground md:hidden h-6 w-6 flex items-center justify-center rounded hover:bg-primary-foreground/20"
          >
            <X size={14} />
          </button>
        </div>

        {/* لیست منو */}
        <div className="h-[calc(100vh-2rem)] overflow-y-auto py-2 px-2 custom-scrollbar">
          {!loading && (
            <nav className="space-y-0.5">
              {MENU_ITEMS.map((item, index) => (
                <SidebarItemWrapper
                  key={index}
                  item={item}
                  isCollapsed={isCollapsed}
                  onCollapsedIconClick={toggleCollapse}
                  // تغییر: پاس دادن تابع بستن به عنوان onItemClick
                  onItemClick={onClose}
                />
              ))}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}
