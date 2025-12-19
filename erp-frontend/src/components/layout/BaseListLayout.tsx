"use client";

import React, { useState } from "react";
import { Maximize2, Minimize2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTabs } from "@/providers/TabsProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BaseListLayoutProps {
  title: string;
  icon?: React.ElementType; // آیکون کنار تایتل (مثل Ruler)
  children: React.ReactNode;
  actions?: React.ReactNode; // دکمه‌های سمت چپ (مثل "واحد جدید")
  count?: number; // تعداد رکوردها (اختیاری)
}

export default function BaseListLayout({
  title,
  icon: Icon,
  children,
  actions,
  count,
}: BaseListLayoutProps) {
  const { closeTab, activeTabId } = useTabs();
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background transition-all duration-300",
        // منطق تمام صفحه:
        isFullscreen ? "fixed inset-0 z-[100]" : "relative"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-gradient-to-l from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 backdrop-blur supports-[backdrop-filter]:bg-card/90 px-4 py-2.5 shadow-sm h-12">
        {/* Right Side: Title & Icon */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closeTab(activeTabId)}
                  className="h-8 w-8 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowRight
                    size={18}
                    className="text-slate-600 dark:text-slate-400"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                بستن
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <h1 className="text-sm font-bold text-foreground truncate bg-gradient-to-l from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {title}
            </h1>
            {count !== undefined && (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-mono">
                {count}
              </span>
            )}
          </div>
        </div>

        {/* Left Side: Actions & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          {/* دکمه‌های سفارشی (مثل دکمه افزودن جدید) */}
          {actions}

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* دکمه تمام صفحه */}
          <TooltipProvider delayDuration={200}>
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
              <TooltipContent side="bottom" className="text-[10px] ">
                {isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-950/50">
        {children}
      </div>
    </div>
  );
}
