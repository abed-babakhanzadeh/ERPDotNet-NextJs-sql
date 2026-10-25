"use client";

import React, { useState } from "react";
import { Maximize2, Minimize2, ArrowRight, Info } from "lucide-react";
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
  description?: string; // اضافه شد
  icon?: React.ElementType;
  children: React.ReactNode;
  actions?: React.ReactNode;
  count?: number;
}

export default function BaseListLayout({
  title,
  description, // اضافه شد
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
        isFullscreen ? "fixed inset-0 z-[100]" : "relative",
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-card px-3 sm:px-4 py-2.5 h-12">
        {/* Right Side: Title & Icon */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closeTab(activeTabId)}
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="بستن"
                >
                  <ArrowRight size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                بستن
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}

            {/* نمایش تایتل با تولتیپ توضیحات */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h1 className="truncate text-sm font-bold text-foreground sm:text-base cursor-default">
                    {title}
                  </h1>
                </TooltipTrigger>
                {description && (
                  <TooltipContent
                    side="bottom"
                    className="text-xs max-w-[300px]"
                  >
                    {description}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {count !== undefined && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {count.toLocaleString("fa-IR")}
              </span>
            )}
          </div>
        </div>

        {/* Left Side: Actions & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}

          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="hidden h-8 w-8 text-muted-foreground sm:inline-flex"
                  aria-label={isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
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
      <div className="flex-1 min-h-0 bg-background">
        {children}
      </div>
    </div>
  );
}
