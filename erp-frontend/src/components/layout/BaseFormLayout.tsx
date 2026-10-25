"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Loader2,
  ArrowRight,
  Save,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react"; // اضافه شدن آیکون‌ها
import { Button } from "@/components/ui/button";
import { useTabs } from "@/providers/TabsProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // اضافه شدن cn
import { DISCARD_CHANGES, useConfirm } from "@/providers/ConfirmProvider";

interface BaseFormLayoutProps {
  title: string;
  isSubmitting?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitText?: string;
  showActions?: boolean;
  headerActions?: React.ReactNode;
  formId?: string;
  /** فرم تغییر ذخیره‌نشده دارد: نشانگر، تأیید قبل از ترک فرم و هشدار مرورگر */
  isDirty?: boolean;
  /** اعتبارسنجی با خود فرم است (مثلاً zod)، نه با پیام‌های بومی مرورگر */
  noValidate?: boolean;
}

export default function BaseFormLayout({
  title,
  isSubmitting = false,
  isLoading = false,
  children,
  onSubmit,
  onCancel,
  submitText = "ثبت",
  showActions = true,
  headerActions,
  formId = "base-form-id",
  isDirty = false,
  noValidate,
}: BaseFormLayoutProps) {
  const { closeTab, activeTabId, setTabDirty } = useTabs();
  const pathname = usePathname();
  const confirm = useConfirm();
  // --- استیت جدید برای تمام صفحه ---
  const [isFullscreen, setIsFullscreen] = useState(false);
  // هنگام ثبت یا بارگذاری، فرم «کثیف» حساب نمی‌شود تا بستن تب یا رفتن به صفحه بعد از ذخیره موفق تأیید نخواهد
  const hasUnsavedChanges = isDirty && !isSubmitting && !isLoading;

  useEffect(() => {
    setTabDirty(pathname, hasUnsavedChanges);
    return () => setTabDirty(pathname, false);
  }, [pathname, hasUnsavedChanges, setTabDirty]);

  // رفرش یا بستن مرورگر
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  // Ctrl+S / Cmd+S برای ثبت فرم
  useEffect(() => {
    if (!onSubmit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isSubmitting || isLoading) return;
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) form.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSubmit, formId, isSubmitting, isLoading]);

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      if (!(await confirm(DISCARD_CHANGES))) return;
      setTabDirty(pathname, false);
    }
    if (onCancel) {
      onCancel();
    } else {
      closeTab(activeTabId);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background transition-all duration-300",
        // در حالت تمام صفحه، z-index بالا می‌گیرد و فیکس می‌شود
        isFullscreen ? "fixed inset-0 z-[100]" : "relative",
      )}
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-card px-3 sm:px-4 py-2.5 h-12">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="بستن"
                  title="بازگشت"
                >
                  <ArrowRight size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                بازگشت
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
            {title}
          </h1>
          {hasUnsavedChanges && (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning"
              role="status"
            >
              <span className="size-1.5 rounded-full bg-warning" aria-hidden />
              <span className="sr-only sm:not-sr-only">ذخیره نشده</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2 shrink-0">
              {/* دکمه‌های سفارشی */}
              {headerActions}

              {showActions && onSubmit && (
                <>
                  {/* دکمه انصراف */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="h-8 gap-2"
                      >
                        <X size={15} className="text-muted-foreground" />
                        <span className="sr-only sm:not-sr-only text-xs">انصراف</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-[10px] sm:hidden"
                    >
                      انصراف
                    </TooltipContent>
                  </Tooltip>

                  {/* دکمه ذخیره */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        form={formId}
                        size="sm"
                        disabled={isSubmitting || isLoading}
                        className="h-8 gap-2"
                        aria-keyshortcuts="Control+S"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="sr-only sm:not-sr-only text-xs">
                              در حال ثبت...
                            </span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span className="sr-only sm:not-sr-only text-xs">
                              {submitText}
                            </span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-[10px] sm:hidden"
                    >
                      {submitText}
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
                  {/* دکمه جدید: تمام صفحه */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        aria-label={isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
                        className="hidden h-8 w-8 text-muted-foreground sm:inline-flex"
                      >
                        {isFullscreen ? (
                          <Minimize2 size={16} />
                        ) : (
                          <Maximize2 size={16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">
                      {isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
        {isLoading ? (
          <div className="flex h-full items-center justify-center flex-col gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 w-full h-full">
            {" "}
            {/* h-full added */}
            {onSubmit ? (
              <form
                id={formId}
                onSubmit={onSubmit}
                noValidate={noValidate}
                className="flex flex-col gap-4 h-full" // h-full added
              >
                {children}
              </form>
            ) : (
              <div className="flex flex-col gap-4 h-full">{children}</div> // h-full added
            )}
          </div>
        )}
      </div>

      {/* Loading Progress Bar */}
      {isSubmitting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div className="h-full bg-primary animate-loading-bar"></div>
        </div>
      )}
    </div>
  );
}
