// hooks/useLocalDataTable.tsx
import { useMemo, useState } from "react";
import type { SortConfig, ColumnFilter as AdvancedColumnFilter, FilterCondition } from "@/types";

/**
 * همان خروجی useServerDataTable، برای داده‌ای که یک‌جا در حافظه است (مثل نتیجه یک محاسبه).
 * جستجو، فیلتر ستونی، فیلتر پیشرفته، مرتب‌سازی و صفحه‌بندی سمت مرورگر انجام می‌شود
 * تا همه جدول‌ها از همان DataTable واحد استفاده کنند.
 */
export function useLocalDataTable<TData extends object>(rows: TData[], options?: { initialPageSize?: number; isLoading?: boolean }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: options?.initialPageSize ?? 20 });
  const [sorting, setSorting] = useState<SortConfig>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedColumnFilter[]>([]);

  const filtered = useMemo(() => {
    const term = globalFilter.trim().toLowerCase();
    let result = rows.filter((row) => {
      const values = Object.values(row);
      if (term && !values.some((v) => v != null && String(v).toLowerCase().includes(term))) return false;
      for (const [key, value] of Object.entries(columnFilters))
        if (value && !String(field(row, key) ?? "").toLowerCase().includes(value.toLowerCase())) return false;
      return advancedFilters.every((f) => {
        const results = f.conditions.map((c) => matches(field(row, f.key), c));
        return f.logic === "or" ? results.some(Boolean) : results.every(Boolean);
      });
    });
    if (sorting) {
      const dir = sorting.direction === "descending" ? -1 : 1;
      result = [...result].sort((a, b) => compare(field(a, sorting.key), field(b, sorting.key)) * dir);
    }
    return result;
  }, [rows, globalFilter, columnFilters, advancedFilters, sorting]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  // اگر داده کوتاه‌تر شد، صفحه جاری از محدوده بیرون نمی‌ماند
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const data = filtered.slice(pageIndex * pagination.pageSize, (pageIndex + 1) * pagination.pageSize);
  const firstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  return {
    tableProps: {
      data,
      rowCount: filtered.length,
      pageCount,
      pagination: { ...pagination, pageIndex },
      sortConfig: sorting,
      globalFilter,
      advancedFilters,
      columnFilters,
      isLoading: options?.isLoading ?? false,
      onGlobalFilterChange: (value: string) => {
        firstPage();
        setGlobalFilter(value);
      },
      onAdvancedFilterChange: (newFilter: AdvancedColumnFilter | null) => {
        firstPage();
        setAdvancedFilters((prev) => {
          if (!newFilter) return prev;
          const others = prev.filter((f) => f.key !== newFilter.key);
          return newFilter.conditions.some((c) => c.value) ? [...others, newFilter] : others;
        });
      },
      onColumnFilterChange: (key: string, value: string) => {
        firstPage();
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
      },
      onClearAllFilters: () => {
        setGlobalFilter("");
        setAdvancedFilters([]);
        setColumnFilters({});
        firstPage();
      },
      onPaginationChange: setPagination,
      onSortChange: setSorting,
    },
    totalCount: filtered.length,
  };
}

const field = (row: object, key: string) => (row as Record<string, unknown>)[key];

function compare(a: unknown, b: unknown) {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fa");
}

function matches(value: unknown, c: FilterCondition) {
  const text = value == null ? "" : String(value).toLowerCase();
  const target = String(c.value ?? "").toLowerCase();
  const num = Number(value);
  switch (c.operator) {
    case "isEmpty":
      return text === "";
    case "isNotEmpty":
      return text !== "";
    case "notContains":
      return !text.includes(target);
    case "equals":
      return typeof value === "number" ? num === Number(c.value) : text === target;
    case "notEquals":
      return typeof value === "number" ? num !== Number(c.value) : text !== target;
    case "startsWith":
      return text.startsWith(target);
    case "endsWith":
      return text.endsWith(target);
    case "gt":
      return num > Number(c.value);
    case "gte":
      return num >= Number(c.value);
    case "lt":
      return num < Number(c.value);
    case "lte":
      return num <= Number(c.value);
    case "between":
      return num >= Number(c.value) && num <= Number(c.value2);
    case "notBetween":
      return num < Number(c.value) || num > Number(c.value2);
    default:
      return text.includes(target);
  }
}
