"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter as FilterIcon, Calendar, X } from "lucide-react";
import type {
  ColumnConfig,
  ColumnFilter as AdvancedColumnFilter,
} from "@/types";
import { FilterPopoverContent } from "./data-table-column-header";
import { cn } from "@/lib/utils";

// ایمپورت‌های تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ColumnFilterProps {
  column: ColumnConfig;
  columnKey: string;
  value: string;
  initialAdvancedFilter?: AdvancedColumnFilter | undefined;
  onChange: (key: string, value: string) => void;
  onApplyAdvancedFilter: (newFilter: AdvancedColumnFilter | null) => void;
}

export function ColumnFilter({
  column,
  columnKey,
  value,
  initialAdvancedFilter,
  onChange,
  onApplyAdvancedFilter,
}: ColumnFilterProps) {
  // ✨ اصلاح طلایی 1: استفاده از value || "" برای جلوگیری از پاس دادن undefined به Input
  const [filterValue, setFilterValue] = useState(value || "");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const debouncedValue = useDebounce(filterValue, 500);

  // ✨ اصلاح طلایی 2: همگام‌سازی استیت درونی با پراپِ والد (مثلاً وقتی دکمه پاک کردن کل فیلترها زده می‌شود)
  useEffect(() => {
    setFilterValue(value || "");
  }, [value]);

  useEffect(() => {
    // مقایسه با استرینگ خالی به جای undefined
    if (debouncedValue !== (value || "")) {
      onChange(columnKey, debouncedValue);
    }
  }, [debouncedValue, columnKey, onChange, value]);

  const isFiltered =
    !!filterValue ||
    (initialAdvancedFilter &&
      initialAdvancedFilter.conditions.some((c) => !!c.value));

  const isDate = column.type === "date";

  const handleClear = () => {
    setFilterValue("");
    onChange(columnKey, "");
  };

  return (
    <div className="flex items-center gap-1.5 w-full">
      {/* 🌟 بخش جدید: جستجوی ستونی همراه با تقویم و دکمه X 🌟 */}
      {isDate ? (
        <div className="flex items-center gap-1 relative w-full">
          <div className="relative flex-1">
            <Input
              placeholder="مثال: 1403/05/12"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              // چون LTR است، پدینگ راست (pr-7) می‌دهیم تا متن زیر دکمه نرود
              className="h-8 w-full text-xs font-mono text-left pr-7"
              dir="ltr"
            />
            {filterValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            format="YYYY/MM/DD"
            portal // ✨ کلید طلایی برای بیرون زدن تقویم از کادر
            zIndex={99999}
            value={
              filterValue
                ? new DateObject({
                    date: filterValue,
                    format: "YYYY/MM/DD",
                    calendar: persian,
                  })
                : null
            }
            onChange={(date: any) => {
              if (date) {
                setFilterValue(date.format("YYYY/MM/DD"));
              } else {
                handleClear();
              }
            }}
            render={(value, openCalendar) => (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 hover:bg-accent"
                onClick={openCalendar}
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          />
        </div>
      ) : (
        <div className="relative w-full">
          <Input
            placeholder={`جستجو در ${column.title}...`}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            // چون RTL است، پدینگ چپ (pl-7) می‌دهیم
            className="h-8 w-full text-xs pl-7"
          />
          {filterValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Popover فیلتر پیشرفته */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-all shrink-0",
              isFiltered
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {isFiltered ? (
              <div className="relative">
                <FilterIcon className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary-foreground" />
              </div>
            ) : (
              <FilterIcon className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        {/* جلوگیری از بسته شدن پاپ‌اوور هنگام کلیک روی تقویمِ Portalled */}
        <PopoverContent
          className="w-96 p-4"
          align="start"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.closest(".rmdp-wrapper") ||
              target.closest(".rmdp-container")
            ) {
              e.preventDefault();
            }
          }}
        >
          <FilterPopoverContent
            column={column}
            initialFilter={initialAdvancedFilter as any}
            onApply={(newFilterState: AdvancedColumnFilter) => {
              onApplyAdvancedFilter(newFilterState);
              setPopoverOpen(false);
            }}
            onClear={() => {
              onApplyAdvancedFilter(null);
              setFilterValue("");
              onChange(columnKey, "");
              setPopoverOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
