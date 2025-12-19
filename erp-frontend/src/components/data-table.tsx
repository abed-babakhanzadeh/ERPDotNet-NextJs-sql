"use client";

import * as React from "react";
import "react-resizable/css/styles.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  FilterX,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // ایمپورت تولتیپ

import type {
  SortConfig,
  ColumnFilter as AdvancedColumnFilter,
  ColumnConfig,
} from "@/types";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableColumnHeader } from "./data-table-column-header";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Resizable } from "react-resizable";
import { ColumnFilter } from "./column-filter";

type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

interface TableRow {
  id: number | string;
  [key: string]: any;
}

// تعریف اینترفیس دسترسی‌ها
export interface DataTablePermissions {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
}

interface DataTableProps<TData extends TableRow> {
  columns: ColumnConfig[];
  data: TData[];
  rowCount: number;
  pageCount: number;
  pagination: PaginationState;
  sortConfig: SortConfig;
  globalFilter: string;
  advancedFilters: AdvancedColumnFilter[];
  columnFilters: Record<string, string>;
  isLoading: boolean;

  onGlobalFilterChange: (value: string) => void;
  onAdvancedFilterChange: (newFilter: AdvancedColumnFilter | null) => void;
  onColumnFilterChange: (key: string, value: string) => void;
  onClearAllFilters: () => void;
  onPaginationChange: (
    updater: (old: PaginationState) => PaginationState
  ) => void;
  onSortChange: (
    updater: ((old: SortConfig) => SortConfig | null) | SortConfig | null
  ) => void;

  renderRowActions?: (row: TData) => React.ReactNode;
  renderContextMenu?: (row: TData, closeMenu: () => void) => React.ReactNode;

  onView?: (row: TData) => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;

  // پراپ جدید برای کنترل دقیق دسترسی‌ها
  permissions?: DataTablePermissions;

  onRowDoubleClick?: (row: TData) => void;
  onRefresh?: () => void;
}

export function DataTable<TData extends TableRow>({
  columns,
  data,
  rowCount,
  pageCount,
  pagination,
  sortConfig,
  globalFilter,
  advancedFilters,
  columnFilters,
  isLoading,
  onGlobalFilterChange,
  onAdvancedFilterChange,
  onColumnFilterChange,
  onClearAllFilters,
  onPaginationChange,
  onSortChange,
  renderRowActions,
  renderContextMenu,
  onView,
  onEdit,
  onDelete,
  // مقادیر پیش‌فرض دسترسی true است مگر اینکه خلافش ارسال شود
  permissions = { view: true, edit: true, delete: true },
  onRowDoubleClick,
  onRefresh,
}: DataTableProps<TData>) {
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [contextMenuRow, setContextMenuRow] = React.useState<TData | null>(
    null
  );
  const [contextMenuPosition, setContextMenuPosition] = React.useState({
    x: 0,
    y: 0,
  });
  const [selectedRowId, setSelectedRowId] = React.useState<
    number | string | null
  >(null);

  const [columnWidths, setColumnWidths] = React.useState<
    Record<string, number>
  >(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: 150 }), { actions: 140 })
  );

  const handleResize =
    (key: string) =>
    (e: any, { size }: any) => {
      setColumnWidths((prev) => ({ ...prev, [key]: size.width }));
    };

  const handleSort = (key: string) => {
    onSortChange((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "ascending") {
          return { key, direction: "descending" };
        }
        return null;
      }
      return { key, direction: "ascending" };
    });
  };

  const handleGlobalFilterChange = (value: string) => {
    onPaginationChange((p) => ({ ...p, pageIndex: 0 }));
    onGlobalFilterChange(value);
  };

  const handleRowClick = (row: TData) => {
    setSelectedRowId(row.id);
  };

  const handleRowDoubleClick = (row: TData) => {
    if (onRowDoubleClick) {
      onRowDoubleClick(row);
    } else if (onView && permissions.view) {
      onView(row);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, row: TData) => {
    e.preventDefault();
    setSelectedRowId(row.id);
    setContextMenuRow(row);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!contextMenuOpen) return;
      setContextMenuOpen(false);
      setContextMenuRow(null);
      if (
        !(e.target as HTMLElement).closest('[role="row"], [role="menuitem"]')
      ) {
        setSelectedRowId(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenuOpen]);

  const closeContextMenu = () => {
    setContextMenuOpen(false);
    setContextMenuRow(null);
  };

  const handleExport = () => {
    console.log("Export triggered");
  };

  const handlePrint = () => {
    window.print();
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (globalFilter) count++;
    Object.values(columnFilters).forEach((val) => {
      if (val) count++;
    });
    advancedFilters.forEach((filter) => {
      if (
        filter.conditions.some((c) => {
          if (["isEmpty", "isNotEmpty"].includes(c.operator)) return true;
          return c.value !== "" && c.value !== null;
        })
      ) {
        count++;
      }
    });
    return count;
  }, [globalFilter, columnFilters, advancedFilters]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-3">
        <DataTableToolbar
          globalFilter={globalFilter}
          onGlobalFilterChange={handleGlobalFilterChange}
          onClearAllFilters={onClearAllFilters}
          onExport={handleExport}
          onPrint={handlePrint}
          activeFiltersCount={activeFiltersCount}
          onRefresh={onRefresh}
        />
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border shadow-sm bg-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b-2 border-border">
                {columns.map((column) => (
                  <Resizable
                    key={column.key}
                    width={columnWidths[column.key] as number}
                    height={0}
                    onResize={handleResize(column.key)}
                    axis="x"
                    minConstraints={[80, 0]}
                    maxConstraints={[600, Infinity]}
                  >
                    <TableHead
                      style={{ width: `${columnWidths[column.key]}px` }}
                      className="bg-muted/90 text-muted-foreground font-semibold h-9"
                    >
                      <div className="flex items-center justify-between h-full overflow-hidden">
                        <DataTableColumnHeader
                          column={column}
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          filter={advancedFilters.find(
                            (f) => f.key === column.key
                          )}
                          onFilterChange={onAdvancedFilterChange}
                        />
                      </div>
                    </TableHead>
                  </Resizable>
                ))}
                {/* ستون عملیات */}
                <TableHead
                  className="no-print text-center sticky top-0 z-10 bg-muted/90 text-muted-foreground font-semibold h-9"
                  style={{ width: `${columnWidths.actions}px` }}
                >
                  عملیات
                </TableHead>
              </TableRow>

              <TableRow className="no-print bg-muted/50 hover:bg-muted/50 border-b border-border sticky top-[36px] z-10">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    style={{
                      width: `${columnWidths[column.key]}px`,
                      maxWidth: `${columnWidths[column.key]}px`,
                    }}
                    className="py-1.5"
                  >
                    <ColumnFilter
                      column={column}
                      columnKey={column.key}
                      value={columnFilters[column.key]}
                      initialAdvancedFilter={advancedFilters.find(
                        (f) => f.key === column.key
                      )}
                      onChange={onColumnFilterChange}
                      onApplyAdvancedFilter={onAdvancedFilterChange}
                    />
                  </TableCell>
                ))}
                <TableCell key="actions-filter" className="p-1"></TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: pagination.pageSize || 10 }).map(
                  (_, index) => (
                    <TableRow
                      key={`skeleton-${index}`}
                      className="border-b border-border h-7"
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          style={{
                            width: `${columnWidths[column.key]}px`,
                            maxWidth: `${columnWidths[column.key]}px`,
                          }}
                          className="py-1.5 px-3"
                        >
                          <div className="h-5 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                      <TableCell
                        className="no-print text-center"
                        style={{ width: `${columnWidths.actions}px` }}
                      >
                        <div className="h-6 w-8 bg-muted rounded animate-pulse mx-auto" />
                      </TableCell>
                    </TableRow>
                  )
                )
              ) : data.length > 0 ? (
                data.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    onClick={() => handleRowClick(row)}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    onContextMenu={(e) => handleContextMenu(e, row)}
                    className={cn(
                      "cursor-pointer border-b border-border transition-colors h-9",

                      // ۱. حالت انتخاب شده (بالاترین اولویت)
                      selectedRowId === row.id
                        ? "!bg-orange-100 dark:!bg-orange-900/40 text-orange-900 dark:text-orange-100 hover:!bg-orange-200"
                        : // ۲. حالت غیرفعال (isActive === false)
                        // از !bg-gray-100 استفاده می‌کنیم تا رنگ hover پیش‌فرض را خنثی کند
                        // grayscale باعث می‌شود کل آیکون‌ها و متون سیاه و سفید شوند
                        row.isActive === false
                        ? "!bg-slate-100 dark:!bg-slate-900 text-muted-foreground/60 grayscale-[1] hover:!bg-slate-200 dark:hover:!bg-slate-800"
                        : // ۳. حالت عادی
                          "hover:bg-muted/50"
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        style={{
                          width: `${columnWidths[column.key]}px`,
                          maxWidth: `${columnWidths[column.key]}px`,
                        }}
                        className="py-1.5 px-3"
                      >
                        <div className="truncate flex items-center">
                          {column.render ? (
                            column.render(row[column.key as keyof TData], row)
                          ) : column.key === "isActive" ? (
                            <Badge
                              variant={row.isActive ? "default" : "destructive"}
                              className={cn(
                                "text-white font-medium shadow-sm",
                                row.isActive
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : "bg-red-500 hover:bg-red-600"
                              )}
                            >
                              {row.isActive ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 ml-1" /> فعال
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 ml-1" /> غیرفعال
                                </>
                              )}
                            </Badge>
                          ) : (
                            <span className="text-sm">
                              {String(row[column.key as keyof TData] ?? "—")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    ))}

                    <TableCell
                      className="no-print text-center"
                      style={{ width: `${columnWidths.actions}px` }}
                    >
                      {/* اینجا تغییر کرد: استفاده از آیکون‌های پایه به جای سه نقطه */}
                      <TooltipProvider delayDuration={0}>
                        {renderRowActions ? (
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderRowActions(row)}
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* دکمه مشاهده */}
                            {permissions.view && onView && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => onView(row)}
                                  >
                                    <Eye size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>مشاهده جزئیات</TooltipContent>
                              </Tooltip>
                            )}

                            {/* دکمه ویرایش */}
                            {permissions.edit && onEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => onEdit(row)}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>ویرایش</TooltipContent>
                              </Tooltip>
                            )}

                            {/* دکمه حذف */}
                            {permissions.delete && onDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onDelete(row)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>حذف</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-center"
                    style={{ height: "calc(100vh - 300px)" }}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 h-full">
                      <div className="p-3 rounded-full bg-muted">
                        <FilterX className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        هیچ نتیجه‌ای یافت نشد
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        فیلترهای خود را تغییر دهید یا جستجوی جدیدی انجام دهید
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {isLoading && (
          <div className="h-1 w-full bg-muted overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-primary animate-loading-bar"
              style={{
                width: "40%",
              }}
            />
          </div>
        )}

        {/* منوی راست کلیک */}
        <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
          <DropdownMenuTrigger asChild>
            <div
              style={{
                position: "fixed",
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            style={{ direction: "rtl" }} // اضافه کردن جهت RTL برای کانتنت منو
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="bg-popover border-border min-w-[160px]"
          >
            {contextMenuRow && renderContextMenu ? (
              renderContextMenu(contextMenuRow, closeContextMenu)
            ) : (
              // --- منوی راست کلیک پیش‌فرض با اصلاح RTL ---
              <>
                {contextMenuRow && onView && permissions.view && (
                  <DropdownMenuItem
                    onClick={() => {
                      onView(contextMenuRow!);
                      closeContextMenu();
                    }}
                    // استفاده از flex-row و justify-start برای اطمینان از قرارگیری آیکون در راست
                    className="flex flex-row items-center justify-start gap-2 cursor-pointer text-right"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>مشاهده جزئیات</span>
                  </DropdownMenuItem>
                )}

                {contextMenuRow && onEdit && permissions.edit && (
                  <DropdownMenuItem
                    onClick={() => {
                      onEdit(contextMenuRow!);
                      closeContextMenu();
                    }}
                    className="flex flex-row items-center justify-start gap-2 cursor-pointer text-right"
                  >
                    <Pencil className="w-4 h-4 text-emerald-600" />
                    <span>ویرایش</span>
                  </DropdownMenuItem>
                )}

                {(onView || onEdit) && onDelete && permissions.delete && (
                  <DropdownMenuSeparator />
                )}

                {contextMenuRow && onDelete && permissions.delete && (
                  <DropdownMenuItem
                    onClick={() => {
                      onDelete(contextMenuRow!);
                      closeContextMenu();
                    }}
                    className="flex flex-row items-center justify-start gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-right"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-shrink-0 mt-3">
        <DataTablePagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          pageCount={pageCount}
          rowCount={rowCount}
        />
      </div>
    </div>
  );
}
