"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter as FilterIcon, FilterX, Search } from "lucide-react";
import type {
  ColumnConfig,
  ColumnFilter as AdvancedColumnFilter,
} from "@/types";
import { FilterPopoverContent } from "./data-table-column-header";
import { cn } from "@/lib/utils";

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
  const [filterValue, setFilterValue] = useState(value || "");
  const debouncedFilterValue = useDebounce(filterValue, 500);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isFiltered =
    initialAdvancedFilter &&
    initialAdvancedFilter.conditions.length > 0 &&
    initialAdvancedFilter.conditions.some((c) => {
      if (["isEmpty", "isNotEmpty"].includes(c.operator)) {
        return true;
      }
      return c.value !== "" && c.value !== null;
    });

  useEffect(() => {
    if (debouncedFilterValue !== value) {
      onChange(columnKey, debouncedFilterValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterValue]);

  useEffect(() => {
    if (value !== filterValue) {
      setFilterValue(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex items-center gap-1.5 group">
      {/* Input با طراحی مدرن */}
      <div className="relative flex-1">
        <Search
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors pointer-events-none",
            isFocused ? "text-primary" : "text-muted-foreground/50"
          )}
        />
        <Input
          placeholder="جستجو سریع..."
          value={filterValue ?? ""}
          onChange={(e) => setFilterValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "h-8 py-1 pr-8 text-sm transition-all",
            "border-muted-foreground/20",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            "hover:border-muted-foreground/30",
            filterValue && "border-primary/30 bg-primary/5"
          )}
          onClick={(e) => e.stopPropagation()}
        />
        {filterValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setFilterValue("");
              onChange(columnKey, "");
            }}
          >
            <FilterX className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* دکمه فیلتر پیشرفته */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-all",
              isFiltered
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
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
        <PopoverContent className="w-96 p-4" align="start">
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
