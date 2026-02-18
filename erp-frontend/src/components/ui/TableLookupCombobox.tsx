"use client";

import * as React from "react";
import { ChevronsUpDown, Loader2, X } from "lucide-react";
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

  const searchFields = React.useMemo(() => {
    if (searchableFields) return searchableFields;
    return columns.map((c) => c.key);
  }, [searchableFields, columns]);

  const displayFields_ = React.useMemo(() => {
    if (displayFields) return displayFields;
    return columns.slice(0, 2).map((c) => c.key);
  }, [displayFields, columns]);

  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) return items;
    const searchLower = searchTerm.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const fieldValue = item[field];
        if (fieldValue === null || fieldValue === undefined) return false;
        const fieldLower = String(fieldValue).toLowerCase();
        return fieldLower.includes(searchLower);
      }),
    );
  }, [items, searchTerm, searchFields]);

  React.useEffect(() => {
    if (value && items) {
      const selected = items.find((item) => item.id === value);
      if (selected) setSelectedItem(selected);
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
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-right h-8 text-xs" // سایز دکمه اصلی هم کوچک شد
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            <div className="flex-1 text-right truncate">
              {selectedItem ? (
                <span>
                  {displayFields_
                    .map((field) => selectedItem[field])
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              ) : (
                <span className="text-muted-foreground truncate block">
                  {placeholder}
                </span>
              )}
            </div>
          </div>
          {selectedItem && (
            <X
              className="h-3 w-3 opacity-50 hover:opacity-100 shrink-0 mr-1"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[90vw] sm:w-auto sm:min-w-[400px] max-w-[95vw]"
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={10} // جلوگیری از چسبیدن به لبه‌ها
      >
        <div className="p-2 border-b">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-right h-8 text-xs"
            autoFocus
          />
        </div>

        <div className="border-b bg-muted/50 sticky top-0 z-10">
          <div
            className="grid text-right"
            style={{
              gridTemplateColumns: columns
                .map((c) => c.width || "1fr")
                .join(" "),
              direction: "rtl",
            }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="px-3 py-2 text-[10px] font-semibold text-muted-foreground truncate"
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>

        {/* ✅ اصلاح ارتفاع: استفاده از max-h به جای h ثابت */}
        <ScrollArea className="h-auto max-h-[250px]">
          {loading ? (
            <div className="flex justify-center items-center p-4 h-[100px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "hover:bg-muted/60 transition-colors duration-100 w-full text-right focus:bg-muted/60 outline-none",
                    selectedItem?.id === item.id && "bg-primary/10",
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
                      className="px-3 py-2 text-xs truncate text-right"
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
            <div className="flex flex-col justify-center items-center p-4 text-muted-foreground text-xs h-[100px] gap-2">
              {!searchTerm && items.length === 0 ? (
                <span>برای مشاهده نتایج تایپ کنید...</span>
              ) : (
                <span>موردی یافت نشد</span>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
