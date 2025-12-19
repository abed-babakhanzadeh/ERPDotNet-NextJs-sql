"use client";

import React, { useState } from "react";
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

interface BaseFormLayoutProps {
  title: string;
  isSubmitting?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitText?: string;
  showActions?: boolean;
  headerActions?: React.ReactNode;
  formId?: string;
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
}: BaseFormLayoutProps) {
  const { closeTab, activeTabId } = useTabs();
  // --- استیت جدید برای تمام صفحه ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCancel = () => {
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
        isFullscreen ? "fixed inset-0 z-[100]" : "relative"
      )}
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-gradient-to-l from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 backdrop-blur supports-[backdrop-filter]:bg-card/90 px-4 py-2.5 shadow-sm h-12">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="h-8 w-8 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="بازگشت"
                >
                  <ArrowRight
                    size={18}
                    className="text-slate-600 dark:text-slate-400"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                بازگشت
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <h1 className="text-sm font-bold text-foreground truncate bg-gradient-to-l from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
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
                        className="h-8 gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-all"
                      >
                        <X size={15} className="text-slate-500" />
                        <span className="hidden sm:inline text-xs">انصراف</span>
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
                        className="h-8 gap-2 bg-gradient-to-l from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline text-xs">
                              در حال ثبت...
                            </span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span className="hidden sm:inline text-xs">
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
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                  {/* دکمه جدید: تمام صفحه */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
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
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {isLoading ? (
          <div className="flex h-full items-center justify-center flex-col gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          <div className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 animate-loading-bar"></div>
        </div>
      )}
    </div>
  );
}
