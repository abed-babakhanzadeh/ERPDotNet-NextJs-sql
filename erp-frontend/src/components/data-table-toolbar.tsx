"use client";

import { Download, Printer, Search, FilterX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  onClearAllFilters: () => void;
  onExport: () => void;
  onPrint: () => void;
  onRefresh?: () => void;
  activeFiltersCount?: number;
  isExporting?: boolean;
}

export function DataTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  onClearAllFilters,
  onExport,
  onPrint,
  onRefresh,
  activeFiltersCount = 0,
  isExporting = false,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/30 px-2 h-8 no-print gap-2">
      {/* Search Input - سمت راست */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
        <div className="relative flex-1 sm:flex-initial">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="جستجو..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-6 w-full sm:w-52 ps-7 text-xs border-border/50 focus-visible:ring-1"
          />
        </div>
        {activeFiltersCount > 0 && (
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-primary/20 hidden sm:flex"
          >
            {activeFiltersCount} فیلتر
          </Badge>
        )}
        {/* نمایش تعداد فیلتر به صورت عدد در موبایل */}
        {activeFiltersCount > 0 && (
          <div className="flex sm:hidden h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
            {activeFiltersCount}
          </div>
        )}
      </div>

      {/* Action Buttons - سمت چپ */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearAllFilters}
                className="h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive"
              >
                <FilterX className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              پاک کردن فیلترها
            </TooltipContent>
          </Tooltip>

          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  className="h-6 w-6 rounded hover:bg-accent"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                بروزرسانی
              </TooltipContent>
            </Tooltip>
          )}

          {/* دکمه Excel - مخفی در موبایل */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onExport}
                disabled={isExporting}
                className="h-6 w-6 rounded hover:bg-accent disabled:opacity-50 hidden sm:flex"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              {isExporting ? "در حال خروجی..." : "خروجی Excel"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrint}
                className="h-6 w-6 rounded hover:bg-accent"
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              چاپ
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
