"use client";

import * as React from "react";
import { FilterX } from "lucide-react";
import type { ColumnConfig } from "@/types";
import { cn } from "@/lib/utils";

interface MobileRow {
  id: number | string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface DataTableMobileCardsProps<TData extends MobileRow> {
  columns: ColumnConfig[];
  data: TData[];
  isLoading: boolean;
  pageSize: number;
  selectedRowId: number | string | null;
  renderCell: (column: ColumnConfig, row: TData) => React.ReactNode;
  renderActions: (row: TData) => React.ReactNode;
  onOpen: (row: TData) => void;
}

/** حداکثر تعداد فیلد «برچسب: مقدار» در هر کارت تا کارت‌ها کوتاه بمانند */
const MAX_FIELDS = 6;

/**
 * نمای کارتی جدول در عرض موبایل. همان ستون‌ها و رندرکننده‌های جدول را استفاده می‌کند،
 * پس هر صفحه‌ای که DataTable دارد، بدون تغییر نمای کارتی هم دارد.
 */
export function DataTableMobileCards<TData extends MobileRow>({
  columns,
  data,
  isLoading,
  pageSize,
  selectedRowId,
  renderCell,
  renderActions,
  onOpen,
}: DataTableMobileCardsProps<TData>) {
  const cardColumns = columns.filter((c) => c.mobile !== "hidden");
  const titleColumn =
    cardColumns.find((c) => c.mobile === "title") ??
    cardColumns.find((c) => c.type !== "custom" && c.key !== "isActive");
  const hasActiveFlag = columns.some((c) => c.key === "isActive");
  const fields = cardColumns
    .filter((c) => c !== titleColumn && c.key !== "isActive")
    .slice(0, MAX_FIELDS);

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2" aria-busy>
        {Array.from({ length: Math.min(pageSize || 6, 6) }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 space-y-3">
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-3 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 rounded-xl border bg-card py-16 text-center">
        <div className="rounded-full bg-muted p-3">
          <FilterX className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">هیچ نتیجه‌ای یافت نشد</p>
        <p className="text-xs text-muted-foreground/70">فیلتر یا جستجو را تغییر دهید</p>
      </div>
    );
  }

  return (
    <ul className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-1">
      {data.map((row, index) => (
        <li
          key={row.id ?? index}
          className={cn(
            "rounded-xl border bg-card shadow-sm transition-colors",
            selectedRowId === row.id && "border-primary/40 bg-primary/5",
            row.isActive === false && "bg-muted/40 text-muted-foreground",
          )}
        >
          {/* div به‌جای button: رندر سلول‌ها ممکن است خودشان دکمه (مثلاً tooltip) داشته باشند */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpen(row)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(row);
              }
            }}
            className="block w-full cursor-pointer p-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 font-semibold text-foreground">
                {titleColumn ? renderCell(titleColumn, row) : `#${row.id}`}
              </div>
              {hasActiveFlag && row.isActive === false && (
                <span className="shrink-0 text-[11px] text-muted-foreground">غیرفعال</span>
              )}
            </div>

            {fields.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {fields.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">{column.label}</dt>
                    <dd className="min-w-0 text-sm">{renderCell(column, row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="flex justify-end border-t px-2 py-1">{renderActions(row)}</div>
        </li>
      ))}
    </ul>
  );
}
