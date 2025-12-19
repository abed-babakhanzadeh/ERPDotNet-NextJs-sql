"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  Edit,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PersianDatePicker from "@/components/ui/PersianDatePicker";

// --- Types ---
export type GridColumnType = "text" | "number" | "select" | "readonly" | "date";

export interface GridColumn<T> {
  key: keyof T;
  title: string;
  type: GridColumnType;
  width?: string;
  options?: { label: string; value: any }[];
  required?: boolean;
  placeholder?: string;
  render?: (row: T, index: number) => React.ReactNode;
  disabled?: boolean;
}

export interface GridPermissions {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
  add?: boolean;
}

interface EditableGridProps<T> {
  columns: GridColumn<T>[];
  data: T[];
  onChange: (newData: T[]) => void;
  onAddRow?: () => T;

  // Actions & Permissions
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void; // اگر این پاس داده شود، جای حذف سطری عمل می‌کند
  permissions?: GridPermissions;

  loading?: boolean;
  readOnly?: boolean;
}

export default function EditableGrid<T extends { id?: number | string }>({
  columns,
  data,
  onChange,
  onAddRow,
  onView,
  onEdit,
  onDelete,
  permissions = { view: true, edit: true, delete: true, add: true },
  loading,
  readOnly = false,
}: EditableGridProps<T>) {
  const safeData = Array.isArray(data) ? data : [];

  // --- Context Menu State ---
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // بستن منو با کلیک بیرون
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // --- Handlers ---
  const handleCellChange = (index: number, key: keyof T, value: any) => {
    const newData = [...safeData];
    newData[index] = { ...newData[index], [key]: value };
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

  // هندلر راست کلیک روی سطر
  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (readOnly) return;
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      rowIndex: index,
    });
  };

  const handleAction = (action: "view" | "edit" | "delete", index: number) => {
    setContextMenu(null);
    const row = safeData[index];
    if (action === "view" && onView) onView(row);
    if (action === "edit" && onEdit) onEdit(row);
    if (action === "delete") {
      if (onDelete) {
        onDelete(row); // حذف بیزینس لاجیکی (مثلاً API call)
      } else {
        handleRemoveRow(index); // حذف لوکال از گرید
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative" dir="rtl">
      <div className="border rounded-lg overflow-hidden flex-1 relative bg-card shadow-sm">
        <div className="overflow-auto max-h-[600px] custom-scrollbar pb-10">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10 border-b">
              <tr>
                <th className="w-10 p-2 text-center text-muted-foreground font-semibold text-[11px]">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="p-2 text-right font-semibold text-muted-foreground text-[11px]"
                    style={{ width: col.width }}
                  >
                    {col.title}{" "}
                    {col.required && <span className="text-red-500">*</span>}
                  </th>
                ))}
                {/* ستون عملیات: همیشه هست مگر اینکه ReadOnly باشد */}
                {!readOnly && (
                  <th className="w-24 p-2 text-center text-muted-foreground text-[11px]">
                    عملیات
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {safeData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={cn(
                    "group hover:bg-muted/20 transition-colors cursor-default",
                    contextMenu?.rowIndex === index && "bg-muted/30"
                  )}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                >
                  <td className="p-2 text-center text-muted-foreground text-[11px]">
                    {index + 1}
                  </td>

                  {columns.map((col) => (
                    <td key={String(col.key)} className="p-1.5">
                      {col.render ? (
                        col.render(row, index)
                      ) : col.type === "select" ? (
                        <select
                          disabled={readOnly || loading || col.disabled}
                          value={String(row[col.key] || "")}
                          onChange={(e) =>
                            handleCellChange(index, col.key, e.target.value)
                          }
                          className={cn(
                            "w-full h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 text-right transition-all",
                            !row[col.key] &&
                              col.required &&
                              "border-red-300 bg-red-50/50 dark:bg-red-900/10"
                          )}
                        >
                          <option value="">انتخاب...</option>
                          {col.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : col.type === "readonly" ? (
                        <div className="px-2 py-1 bg-muted/30 rounded text-muted-foreground border border-transparent text-right text-xs">
                          {String(row[col.key] || "-")}
                        </div>
                      ) : col.type === "date" ? (
                        <PersianDatePicker
                          value={String(row[col.key] || "")}
                          onChange={(newVal) =>
                            handleCellChange(index, col.key, newVal)
                          }
                          disabled={readOnly || loading || col.disabled}
                          required={col.required}
                          className="w-full h-7"
                        />
                      ) : (
                        <input
                          type={col.type}
                          disabled={readOnly || loading || col.disabled}
                          value={String(row[col.key] || "")}
                          placeholder={col.placeholder}
                          onChange={(e) =>
                            handleCellChange(index, col.key, e.target.value)
                          }
                          className={cn(
                            "w-full h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 transition-all",
                            col.type === "number"
                              ? "text-left dir-ltr font-mono"
                              : "text-right",
                            !row[col.key] &&
                              col.required &&
                              "border-red-300 bg-red-50/50 dark:bg-red-900/10"
                          )}
                        />
                      )}
                    </td>
                  ))}

                  {/* ستون عملیات با آیکون‌ها */}
                  {!readOnly && (
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* دکمه مشاهده */}
                        {permissions.view && onView && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => onView(row)}
                            title="مشاهده جزئیات"
                          >
                            <Eye size={14} />
                          </Button>
                        )}

                        {/* دکمه ویرایش */}
                        {permissions.edit && onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => onEdit(row)}
                            title="ویرایش"
                          >
                            <Edit size={14} />
                          </Button>
                        )}

                        {/* دکمه حذف */}
                        {permissions.delete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleAction("delete", index)}
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty State */}
              {safeData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="p-6 text-center text-muted-foreground border-dashed"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 opacity-20" />
                      <span className="text-xs">هیچ ردیفی وجود ندارد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div className="h-full bg-blue-500 dark:bg-blue-600 animate-loading-bar"></div>
          </div>
        )}
      </div>

      {/* دکمه افزودن سطر جدید */}
      {!readOnly && onAddRow && permissions.add !== false && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={loading}
            className="border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary gap-1.5 w-full h-8 text-xs"
          >
            <Plus size={14} />
            افزودن سطر جدید
          </Button>
        </div>
      )}

      {/* --- Custom Context Menu (RTL Fixed) --- */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] bg-white dark:bg-zinc-900 border rounded-md shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          dir="rtl"
        >
          <div className="flex flex-col gap-0.5">
            {permissions.view && onView && (
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded-sm w-full text-right transition-colors"
                onClick={() => handleAction("view", contextMenu.rowIndex)}
              >
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>مشاهده جزئیات</span>
              </button>
            )}

            {permissions.edit && onEdit && (
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded-sm w-full text-right transition-colors"
                onClick={() => handleAction("edit", contextMenu.rowIndex)}
              >
                <Edit className="w-3.5 h-3.5 text-amber-500" />
                <span>ویرایش</span>
              </button>
            )}

            {permissions.delete && (
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm w-full text-right transition-colors"
                onClick={() => handleAction("delete", contextMenu.rowIndex)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
