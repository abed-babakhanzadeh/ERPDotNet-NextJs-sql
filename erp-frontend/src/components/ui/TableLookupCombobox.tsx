"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
}

export interface LookupOption {
  id: number | string;
  [key: string]: any;
}

interface TableLookupComboboxProps<T extends LookupOption> {
  value?: number | string | null;
  onValueChange: (value: number | string | null, item?: T) => void;
  columns: ColumnDef[];
  items: T[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  searchableFields?: string[];
  displayFields?: string[];
  onSearch?: (searchTerm: string) => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
  renderCell?: (item: T, column: ColumnDef) => React.ReactNode;
}

export function TableLookupCombobox<T extends LookupOption>({
  value,
  onValueChange,
  columns,
  items,
  loading = false,
  placeholder = "جستجو...",
  disabled = false,
  searchableFields,
  displayFields,
  onSearch,
  onOpenChange,
  renderCell,
}: TableLookupComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);

  // تعیین فیلدهای جستجو
  const searchFields = React.useMemo(() => {
    if (searchableFields) return searchableFields;
    return columns.map((c) => c.key);
  }, [searchableFields, columns]);

  // تعیین فیلدهای نمایش
  const displayFields_ = React.useMemo(() => {
    if (displayFields) return displayFields;
    return columns.slice(0, 2).map((c) => c.key);
  }, [displayFields, columns]);

  // جستجو - case insensitive برای فارسی و انگلیسی
  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) return items;
    const searchLower = searchTerm.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const fieldValue = item[field];
        if (fieldValue === null || fieldValue === undefined) return false;
        const fieldLower = String(fieldValue).toLowerCase();
        return fieldLower.includes(searchLower);
      })
    );
  }, [items, searchTerm, searchFields]);

  // یافتن آیتم انتخاب‌شده
  React.useEffect(() => {
    if (value && items) {
      const selected = items.find((item) => item.id === value);
      if (selected) {
        setSelectedItem(selected);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  const handleSelect = (item: T) => {
    setSelectedItem(item);
    onValueChange(item.id, item);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(null);
    onValueChange(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (newOpen && !items.length && onSearch) {
      onSearch("");
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (onSearch) {
      await onSearch(term);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-right"
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            <div className="flex-1 text-right truncate">
              {selectedItem ? (
                <span className="text-sm">
                  {displayFields_
                    .map((field) => selectedItem[field])
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm truncate block">
                  {placeholder}
                </span>
              )}
            </div>
          </div>
          {selectedItem && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100 shrink-0 mr-1"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        // --- تغییرات اصلی اینجاست ---
        // 1. عرض در موبایل: w-[90vw] (۹۰ درصد عرض صفحه)
        // 2. عرض در دسکتاپ: sm:w-auto و sm:min-w-[480px]
        className="p-0 w-[90vw] sm:w-auto sm:min-w-[480px] max-w-[95vw]"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* Search Box */}
        <div className="p-3 border-b">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-right"
            // autoFocus ممکن است در موبایل کیبورد را باز کند و صفحه بپرد، گاهی برداشتنش UX بهتری دارد
            autoFocus
          />
        </div>

        {/* Table Header */}
        <div className="border-b bg-muted/50 sticky top-0 z-10">
          <div
            className="grid text-right"
            style={{
              // گرید در موبایل هم بر اساس درصد کار می‌کند، پس مشکلی نخواهد داشت
              gridTemplateColumns: columns
                .map((c) => c.width || "1fr")
                .join(" "),
              direction: "rtl",
            }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground truncate"
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center p-4 h-[300px] sm:h-[400px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "hover:bg-muted/60 transition-colors duration-100 w-full text-right",
                    selectedItem?.id === item.id && "bg-primary/15"
                  )}
                  style={{
                    display: "grid",
                    gridTemplateColumns: columns
                      .map((c) => c.width || "1fr")
                      .join(" "),
                    direction: "rtl",
                  }}
                >
                  {columns.map((column) => (
                    <div
                      key={`${item.id}-${column.key}`}
                      className="px-3 py-3 text-sm truncate text-right"
                    >
                      {renderCell ? (
                        renderCell(item, column)
                      ) : (
                        <span className="truncate">
                          {String(item[column.key] ?? "—")}
                        </span>
                      )}
                    </div>
                  ))}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center p-4 text-muted-foreground text-sm h-[300px] sm:h-[400px] gap-2">
              {!searchTerm && items.length === 0 ? (
                <span>برای مشاهده نتایج تایپ کنید...</span>
              ) : (
                <span>هیچ رکوردی با این مشخصات یافت نشد</span>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
