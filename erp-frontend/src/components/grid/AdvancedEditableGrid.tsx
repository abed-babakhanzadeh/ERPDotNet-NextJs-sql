"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PersianDatePicker from "@/components/ui/PersianDatePicker";

// تایپ‌های جدید
export type GridColumnType =
  | "text"
  | "number"
  | "select"
  | "readonly"
  | "date"
  | "custom";

export interface GridColumn<T> {
  key: keyof T;
  title: string;
  type: GridColumnType;
  width?: string;
  options?: { label: string; value: any }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;

  // رندر برای نمایش (مثل گرید قبلی)
  render?: (row: T, index: number) => React.ReactNode;

  // ✅ قابلیت جدید: رندر برای ویرایش (مخصوص Lookup)
  renderEdit?: (
    row: T,
    index: number,
    onValueChange: (val: any) => void,
    onRowChange: (newRow: T) => void,
  ) => React.ReactNode;
}

export interface GridPermissions {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
  add?: boolean;
}

interface AdvancedEditableGridProps<T> {
  columns: GridColumn<T>[];
  data: T[];
  onChange: (newData: T[]) => void;
  onAddRow?: () => T;
  permissions?: GridPermissions;
  loading?: boolean;
  readOnly?: boolean;
}

export default function AdvancedEditableGrid<
  T extends { id?: number | string },
>({
  columns,
  data,
  onChange,
  onAddRow,
  permissions = { view: true, edit: true, delete: true, add: true },
  loading,
  readOnly = false,
}: AdvancedEditableGridProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const prevDataLengthRef = useRef(safeData.length);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // اسکرول خودکار به پایین با اضافه شدن سطر
  useEffect(() => {
    if (safeData.length > prevDataLengthRef.current) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    prevDataLengthRef.current = safeData.length;
  }, [safeData.length]);

  const handleCellChange = (index: number, key: keyof T, value: any) => {
    const newData = [...safeData];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };

  const handleRowChange = (index: number, newRow: T) => {
    const newData = [...safeData];
    newData[index] = newRow;
    onChange(newData);
  };

  const handleAdd = () => {
    if (onAddRow && permissions.add !== false) {
      onChange([...safeData, onAddRow()]);
    }
  };

  const handleRemoveRow = (index: number) => {
    const newData = [...safeData];
    newData.splice(index, 1);
    onChange(newData);
  };

  return (
    <div className="flex flex-col h-full relative" dir="rtl">
      <div className="border rounded-lg overflow-hidden flex-1 relative bg-card shadow-sm min-h-0">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-auto custom-scrollbar pb-10"
        >
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-20 border-b shadow-sm">
              <tr>
                <th className="w-10 p-2 text-center text-muted-foreground font-semibold">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="p-2 text-right font-semibold text-muted-foreground"
                    style={{ width: col.width }}
                  >
                    {col.title}{" "}
                    {col.required && <span className="text-red-500">*</span>}
                  </th>
                ))}
                {!readOnly && (
                  <th className="w-16 p-2 text-center text-muted-foreground">
                    حذف
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {safeData.map((row, index) => (
                <tr
                  key={index}
                  className="group hover:bg-muted/20 transition-colors"
                >
                  <td className="p-2 text-center text-muted-foreground">
                    {index + 1}
                  </td>

                  {columns.map((col) => (
                    <td key={String(col.key)} className="p-1.5 align-top">
                      {/* === منطق رندرینگ === */}

                      {/* 1. حالت سفارشی (برای Lookup) */}
                      {col.type === "custom" && col.renderEdit ? (
                        col.renderEdit(
                          row,
                          index,
                          (val) => handleCellChange(index, col.key, val),
                          (newRow) => handleRowChange(index, newRow),
                        )
                      ) : /* 2. حالت فقط خواندنی */
                      col.type === "readonly" ? (
                        col.render ? (
                          col.render(row, index)
                        ) : (
                          <div className="px-2 py-1.5 bg-muted/30 rounded text-muted-foreground border border-transparent text-right truncate min-h-[2rem]">
                            {String(row[col.key] || "-")}
                          </div>
                        )
                      ) : /* 3. حالت تاریخ شمسی */
                      col.type === "date" ? (
                        <PersianDatePicker
                          value={String(row[col.key] || "")}
                          onChange={(newVal) =>
                            handleCellChange(index, col.key, newVal)
                          }
                          disabled={readOnly || loading || col.disabled}
                          required={col.required}
                          className="w-full h-8"
                        />
                      ) : /* 4. حالت سلکت */
                      col.type === "select" ? (
                        <select
                          disabled={readOnly || loading || col.disabled}
                          value={String(row[col.key] || "")}
                          onChange={(e) =>
                            handleCellChange(index, col.key, e.target.value)
                          }
                          className={cn(
                            "w-full h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 text-right transition-all",
                            !row[col.key] &&
                              col.required &&
                              "border-red-300 bg-red-50/50",
                          )}
                        >
                          <option value="">انتخاب...</option>
                          {col.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        /* 5. حالت پیش‌فرض (Input Text/Number) */
                        <input
                          type={col.type}
                          disabled={readOnly || loading || col.disabled}
                          value={String(row[col.key] || "")}
                          placeholder={col.placeholder}
                          onChange={(e) =>
                            handleCellChange(index, col.key, e.target.value)
                          }
                          className={cn(
                            "w-full h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 transition-all",
                            col.type === "number"
                              ? "text-left dir-ltr font-mono"
                              : "text-right",
                            !row[col.key] &&
                              col.required &&
                              "border-red-300 bg-red-50/50",
                          )}
                        />
                      )}
                    </td>
                  ))}

                  {!readOnly && (
                    <td className="p-1.5 text-center align-top">
                      {permissions.delete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleRemoveRow(index)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {safeData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="p-8 text-center text-muted-foreground border-dashed"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      <span className="text-sm">هیچ ردیفی وجود ندارد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!readOnly && onAddRow && permissions.add !== false && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={loading}
            className="border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary gap-2 w-full h-9"
          >
            <Plus size={15} />
            افزودن سطر جدید
          </Button>
        </div>
      )}
    </div>
  );
}
