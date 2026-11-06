"use client";

import type {
  ColumnFilter,
  FilterCondition,
  ColumnConfig,
  SortConfig,
} from "@/types";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter as FilterIcon,
  PlusCircle,
  Trash2,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  CalendarIcon,
  X, // ✨ اضافه شدن آیکون X برای دکمه پاک کردن
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DataTableColumnHeaderProps {
  column: ColumnConfig;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  filter: ColumnFilter | undefined;
  onFilterChange: (newFilter: ColumnFilter | null) => void;
}

// تابع کمکی برای تولید آی‌دی (جایگزین crypto.randomUUID)
function generateUniqueId() {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID();
  }
  // Fallback برای حالت‌های غیر امن (HTTP)
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// عملگرهای کامل برای فیلتر پیشرفته
const filterOperators = {
  string: [
    { value: "contains", label: "شامل", icon: Type },
    { value: "notContains", label: "شامل نباشد", icon: Type },
    { value: "equals", label: "مساوی با", icon: Type },
    { value: "notEquals", label: "نامساوی با", icon: Type },
    { value: "startsWith", label: "شروع با", icon: Type },
    { value: "endsWith", label: "پایان با", icon: Type },
    { value: "isEmpty", label: "خالی است", icon: Type },
    { value: "isNotEmpty", label: "خالی نیست", icon: Type },
  ],
  number: [
    { value: "equals", label: "مساوی (=)", icon: Hash },
    { value: "notEquals", label: "نامساوی (≠)", icon: Hash },
    { value: "gt", label: "بزرگتر از (>)", icon: Hash },
    { value: "gte", label: "بزرگتر مساوی (≥)", icon: Hash },
    { value: "lt", label: "کوچکتر از (<)", icon: Hash },
    { value: "lte", label: "کوچکتر مساوی (≤)", icon: Hash },
    { value: "between", label: "بین دو عدد", icon: Hash },
    { value: "notBetween", label: "خارج از بازه", icon: Hash },
    { value: "isEmpty", label: "خالی است", icon: Hash },
    { value: "isNotEmpty", label: "خالی نیست", icon: Hash },
  ],
  boolean: [
    { value: "equals", label: "برابر با", icon: ToggleLeft },
    { value: "isEmpty", label: "خالی است", icon: ToggleLeft },
    { value: "isNotEmpty", label: "خالی نیست", icon: ToggleLeft },
  ],
  date: [
    { value: "equals", label: "مساوی با", icon: Calendar },
    { value: "notEquals", label: "نامساوی با", icon: Calendar },
    { value: "after", label: "بعد از", icon: Calendar },
    { value: "before", label: "قبل از", icon: Calendar },
    { value: "between", label: "بین دو تاریخ", icon: Calendar },
    { value: "isEmpty", label: "خالی است", icon: Calendar },
    { value: "isNotEmpty", label: "خالی نیست", icon: Calendar },
  ],
};

export function DataTableColumnHeader({
  column,
  sortConfig,
  onSort,
  filter,
  onFilterChange,
}: DataTableColumnHeaderProps) {
  const isSorted = sortConfig?.key === column.key;
  const sortDirection = isSorted ? sortConfig?.direction : null;

  const isFiltered =
    filter &&
    filter.conditions.length > 0 &&
    filter.conditions.some((c) => {
      if (["isEmpty", "isNotEmpty"].includes(c.operator)) {
        return true;
      }
      return c.value !== "" && c.value !== null;
    });

  // عنوان همه ستون‌ها (حتی عددی) راست‌چین می‌ماند تا ردیف هدر یکدست خوانده شود
  const sortable = column.sortable !== false;
  const SortIcon =
    sortDirection === "ascending" ? ArrowUp : sortDirection === "descending" ? ArrowDown : ArrowUpDown;

  const label = (
    <span data-measure className="truncate">
      {column.label}
    </span>
  );

  return (
    <div className="group flex w-full min-w-0 items-center gap-1">
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(column.key)}
          title={`مرتب‌سازی بر اساس ${column.label}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-1 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isSorted ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          {/* فلش فقط روی ستون مرتب‌شده؛ روی بقیه هنگام hover/focus راهنمای کم‌رنگ */}
          <SortIcon
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isSorted
                ? "text-primary"
                : "opacity-0 group-hover:opacity-50 group-focus-within:opacity-50",
            )}
          />
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center py-1 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}

      {isFiltered && (
        <span
          role="img"
          aria-label={`فیلتر فعال: ${filter.conditions.length} شرط`}
          title={`${filter.conditions.length} شرط فیلتر`}
          className="flex shrink-0 items-center gap-0.5 text-primary"
        >
          <FilterIcon aria-hidden className="h-3 w-3" />
          {filter.conditions.length > 1 && (
            <span className="text-[11px] tabular-nums">{filter.conditions.length}</span>
          )}
        </span>
      )}
    </div>
  );
}

export function FilterPopoverContent({
  column,
  initialFilter,
  onApply,
  onClear,
}: {
  column: ColumnConfig;
  initialFilter: ColumnFilter | undefined;
  onApply: (filter: ColumnFilter) => void;
  onClear: () => void;
}) {
  const getOperatorKey = (
    type: ColumnConfig["type"],
  ): keyof typeof filterOperators => {
    if (type === "text") return "string";
    if (type === "custom") return "string";
    return type as keyof typeof filterOperators;
  };

  const defaultCondition: FilterCondition = {
    id: generateUniqueId(),
    operator: filterOperators[getOperatorKey(column.type)][0].value,
    value: "",
  };
  const [logic, setLogic] = useState<"and" | "or">(
    initialFilter?.logic || "and",
  );
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialFilter?.conditions.length
      ? initialFilter.conditions
      : [defaultCondition],
  );

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        operator: filterOperators[getOperatorKey(column.type)][0].value,
        value: "",
      },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleApply = () => {
    const newFilter: ColumnFilter = {
      key: column.key,
      logic,
      conditions: conditions.filter((c) => c.value !== "" && c.value !== null),
    };
    onApply(newFilter);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="grid gap-3 w-[360px]" onKeyDown={handleKeyDown}>
      <div className="space-y-1">
        <h4 className="font-medium text-sm leading-none">
          فیلتر {column.label}
        </h4>
        <p className="text-xs text-muted-foreground">
          ردیف‌ها را بر اساس یک یا چند شرط فیلتر کنید.
        </p>
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pe-1">
        {conditions.map((condition, index) => (
          <div
            key={condition.id}
            className="grid gap-2 p-2 border rounded-md relative bg-muted/30"
          >
            {conditions.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 left-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeCondition(condition.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`operator-${condition.id}`} className="text-xs">
                  شرط
                </Label>
                <Select
                  value={condition.operator}
                  onValueChange={(op) =>
                    updateCondition(condition.id, { operator: op })
                  }
                >
                  <SelectTrigger
                    id={`operator-${condition.id}`}
                    className="h-8"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOperators[getOperatorKey(column.type)].map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`value-${condition.id}`} className="text-xs">
                  مقدار
                </Label>
                <FilterInput
                  columnType={column.type}
                  condition={condition}
                  onChange={updateCondition}
                />
              </div>
            </div>
            {condition.operator === "between" && (
              <div className="grid grid-cols-2 gap-2">
                <div></div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`value2-${condition.id}`} className="text-xs">
                    مقدار دوم
                  </Label>
                  <Input
                    id={`value2-${condition.id}`}
                    value={condition.value2 ?? ""}
                    onChange={(e) =>
                      updateCondition(condition.id, { value2: e.target.value })
                    }
                    type={
                      column.type === "number"
                        ? "number"
                        : column.type === "date"
                          ? "date"
                          : "text"
                    }
                    className="h-8"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="justify-start h-8"
      >
        <PlusCircle className="ms-2 h-3.5 w-3.5" />
        افزودن شرط
      </Button>

      {conditions.length > 1 && (
        <>
          <Separator />
          <RadioGroup
            value={logic}
            onValueChange={(val) => setLogic(val as "and" | "or")}
            className="flex items-center gap-4"
          >
            <Label className="text-xs">منطق اعمال</Label>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="and" id={`logic-and-${column.key}`} />
              <Label htmlFor={`logic-and-${column.key}`} className="text-xs">
                و (And)
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="or" id={`logic-or-${column.key}`} />
              <Label htmlFor={`logic-or-${column.key}`} className="text-xs">
                یا (Or)
              </Label>
            </div>
          </RadioGroup>
        </>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onClear} className="h-8">
          پاک کردن
        </Button>
        <Button size="sm" onClick={handleApply} className="h-8">
          اعمال فیلتر
        </Button>
      </div>
    </div>
  );
}

function FilterInput({
  columnType,
  condition,
  onChange,
}: {
  columnType: ColumnConfig["type"];
  condition: FilterCondition;
  onChange: (id: string, updates: Partial<FilterCondition>) => void;
}) {
  const handleClear = () => onChange(condition.id, { value: "" });

  if (columnType === "boolean") {
    return (
      <div className="flex items-center gap-1 relative w-full">
        <Select
          value={condition.value}
          onValueChange={(val) => onChange(condition.id, { value: val })}
        >
          <SelectTrigger
            id={`value-${condition.id}`}
            className="h-8 flex-1 text-sm"
          >
            <SelectValue placeholder="انتخاب وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">فعال</SelectItem>
            <SelectItem value="false">غیرفعال</SelectItem>
          </SelectContent>
        </Select>
        {condition.value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-accent text-muted-foreground"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (columnType === "date") {
    return (
      <div className="flex items-center gap-1 relative w-full">
        <div className="relative flex-1">
          <Input
            id={`value-${condition.id}`}
            value={condition.value || ""}
            onChange={(e) => onChange(condition.id, { value: e.target.value })}
            placeholder="مثال: 1403/05/12"
            // چون تاریخ است و LTR، پدینگ راست می‌دهیم تا دکمه X روی متن نیفتد
            className="h-8 w-full font-mono text-left text-sm pr-7"
            dir="ltr"
          />
          {condition.value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors z-10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <DatePicker
          calendar={persian}
          locale={persian_fa}
          format="YYYY/MM/DD"
          portal // ✨ کلید طلایی: پرتال باعث خروج تقویم از داخل کادر می‌شود
          zIndex={99999}
          containerClassName="z-[99999]"
          value={
            condition.value
              ? new DateObject({
                  date: condition.value,
                  format: "YYYY/MM/DD",
                  calendar: persian,
                })
              : null
          }
          onChange={(date: any) => {
            if (date) {
              onChange(condition.id, { value: date.format("YYYY/MM/DD") });
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
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        />
      </div>
    );
  }

  // سایر ستون‌ها (متنی و عددی)
  const isLtr = columnType === "number";

  return (
    <div className="relative w-full">
      <Input
        id={`value-${condition.id}`}
        value={condition.value || ""}
        onChange={(e) => onChange(condition.id, { value: e.target.value })}
        placeholder="مقدار جستجو..."
        type={columnType === "number" ? "number" : "text"}
        // اعمال پدینگ هوشمند بر اساس چپ‌چین یا راست‌چین بودن متن
        className={cn("h-8 w-full text-sm", isLtr ? "pr-7" : "pl-7")}
        dir={isLtr ? "ltr" : "rtl"}
      />
      {condition.value && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors z-10",
            isLtr ? "right-1" : "left-1",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
