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
  FilterX,
  PlusCircle,
  Trash2,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

interface DataTableColumnHeaderProps {
  column: ColumnConfig;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  filter: ColumnFilter | undefined;
  onFilterChange: (newFilter: ColumnFilter | null) => void;
}

// تابع کمکی برای تولید آی‌دی (جایگزین crypto.randomUUID)
// این تابع چک می‌کند اگر crypto در دسترس نبود، از روش جایگزین استفاده کند
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
      // عملگرهای بدون مقدار
      if (["isEmpty", "isNotEmpty"].includes(c.operator)) {
        return true;
      }
      return c.value !== "" && c.value !== null;
    });

  // آیکون نوع داده
  const getTypeIcon = () => {
    switch (column.type) {
      case "number":
        return <Hash className="h-3.5 w-3.5 text-muted-foreground" />;
      case "boolean":
        return <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />;
      case "date":
        return <Calendar className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Type className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-1 w-full justify-between group">
      <Button
        variant="ghost"
        onClick={() => onSort(column.key)}
        className={cn(
          "px-2 py-1 h-auto -mr-2 flex-grow justify-start hover:bg-accent/50 transition-colors",
          isSorted && "text-primary font-medium"
        )}
      >
        <div className="flex items-center gap-1.5">
          {getTypeIcon()}
          <span className="truncate">{column.label}</span>
        </div>

        <div className="mr-2">
          {sortDirection === "ascending" ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : sortDirection === "descending" ? (
            <ArrowDown className="h-4 w-4 text-primary" />
          ) : (
            <ArrowUpDown className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          )}
        </div>
      </Button>

      {isFiltered && (
        <Badge
          variant="secondary"
          className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-primary/20"
        >
          {filter.conditions.length}
        </Badge>
      )}

      <div className="w-8" />
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
  const defaultCondition: FilterCondition = {
    id: generateUniqueId(), // تغییر: استفاده از تابع جدید
    operator: filterOperators[column.type][0].value,
    value: "",
  };
  const [logic, setLogic] = useState<"and" | "or">(
    initialFilter?.logic || "and"
  );
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialFilter?.conditions.length
      ? initialFilter.conditions
      : [defaultCondition]
  );

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: generateUniqueId(), // تغییر: استفاده از تابع جدید
        operator: filterOperators[column.type][0].value,
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

      {/* اضافه کردن اسکرول برای شرط‌ها */}
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
                    {filterOperators[column.type].map((op) => (
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
  if (columnType === "boolean") {
    return (
      <Select
        value={condition.value}
        onValueChange={(val) => onChange(condition.id, { value: val })}
      >
        <SelectTrigger id={`value-${condition.id}`} className="h-8">
          <SelectValue placeholder="انتخاب وضعیت" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">فعال</SelectItem>
          <SelectItem value="false">غیرفعال</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (columnType === "date") {
    return (
      <Input
        id={`value-${condition.id}`}
        value={condition.value || ""}
        onChange={(e) => onChange(condition.id, { value: e.target.value })}
        type="date"
        className="h-8"
      />
    );
  }

  return (
    <Input
      id={`value-${condition.id}`}
      value={condition.value || ""}
      onChange={(e) => onChange(condition.id, { value: e.target.value })}
      type={columnType === "number" ? "number" : "text"}
      className="h-8"
    />
  );
}
