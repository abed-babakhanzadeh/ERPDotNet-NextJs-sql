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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilterX, Eye, Pencil, Trash2 } from "lucide-react";
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
import { ActiveBadge } from "./common/StatusBadge";
import { DataTableMobileCards } from "./data-table-mobile-cards";
import { ColumnResizeHandle } from "./data-table-resize-handle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useColumnWidths } from "@/hooks/useColumnWidths";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatGroupedNumber } from "@/lib/format";

/** فاصله افقی سلول + آیکون‌های هدر، برای محاسبه عرض خودکار ستون */
const AUTO_FIT_PADDING = 44;

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

  /**
   * ظاهر جدول: `default` (ردیف‌های ساده) یا `grid` (خطوط عمودی، مناسب جدول‌های عددی/حسابداری)
   */
  variant?: "default" | "grid";
  /** کلید ذخیره چیدمان ستون‌ها؛ پیش‌فرض: مسیر صفحه (بدون شناسه‌های عددی) */
  tableId?: string;
  /** نام فایل خروجی Excel بدون پسوند */
  exportFileName?: string;
}

export function DataTable<TData extends TableRow>({
  columns: allColumns,
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
  variant = "default",
  tableId,
  exportFileName = "export",
}: DataTableProps<TData>) {
  const columns = React.useMemo(() => allColumns.filter((c) => !c.hidden), [allColumns]);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const isGrid = variant === "grid";
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

  const { widthOf, setWidth, minWidthOf } = useColumnWidths(
    columns,
    tableId ?? pathname.replace(/\/\d+(?=\/|$)/g, "/:id"),
  );
  const ACTIONS_WIDTH = 140;

  /** عرض ستون به اندازه طولانی‌ترین محتوای قابل مشاهده (هدر + ردیف‌های همین صفحه) */
  const autoFitColumn = (key: string) => {
    const cells = tableRef.current?.querySelectorAll<HTMLElement>(
      `[data-col-key="${CSS.escape(key)}"] [data-measure]`,
    );
    let max = 0;
    cells?.forEach((el) => {
      max = Math.max(max, el.scrollWidth);
    });
    if (max > 0) setWidth(key, max + AUTO_FIT_PADDING);
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

  /**
   * کیبورد روی ردیف‌ها: بالا/پایین بین ردیف‌ها، Enter همان دوبار کلیک،
   * Shift+F10 یا کلید منو همان راست‌کلیک. فقط ردیف انتخاب‌شده (یا اولی) در ترتیب Tab است.
   */
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (e.target !== e.currentTarget) return; // کلیدهای دکمه‌های داخل ردیف
    const focusSibling = (el: Element | null) => {
      if (el instanceof HTMLTableRowElement && el.dataset.rowIndex !== undefined) {
        e.preventDefault();
        el.focus();
        el.click();
      }
    };
    if (e.key === "ArrowDown") focusSibling(e.currentTarget.nextElementSibling);
    else if (e.key === "ArrowUp") focusSibling(e.currentTarget.previousElementSibling);
    else if (e.key === "Enter") {
      e.preventDefault();
      handleRowDoubleClick(row);
    } else if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
      if (!renderContextMenu) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setSelectedRowId(row.id);
      setContextMenuRow(row);
      setContextMenuPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setContextMenuOpen(true);
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

  // خروجی ردیف‌های همین صفحه؛ کتابخانه xlsx فقط هنگام نیاز بارگذاری می‌شود
  const handleExport = async () => {
    if (data.length === 0) {
      toast.info("ردیفی برای خروجی گرفتن وجود ندارد");
      return;
    }
    try {
      const { exportToExcel } = await import("@/utils/export-to-excel");
      exportToExcel(
        data,
        columns.filter((c) => c.type !== "custom"),
        { filename: `${exportFileName}_${new Date().toISOString().slice(0, 10)}.xlsx` },
      );
    } catch {
      toast.error("ساخت فایل Excel با خطا مواجه شد. دوباره تلاش کنید.");
    }
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

  const renderCell = (column: ColumnConfig, row: TData) => {
    const isNumeric = column.type === "number";
    if (column.render) {
      // ستون عددی با render سفارشی هم همان تراز و ارقام هم‌عرض را می‌گیرد
      return (
        <div
          data-measure
          className={cn(
            "flex min-w-0 items-center",
            isNumeric && "justify-end tabular-nums",
          )}
        >
          {column.render(row[column.key as keyof TData], row)}
        </div>
      );
    }
    if (column.key === "isActive") return <ActiveBadge active={!!row.isActive} />;
    const value = row[column.key as keyof TData];
    const text =
      isNumeric && typeof value === "number" ? formatGroupedNumber(value) : String(value ?? "—");
    // span بلوکی تا ellipsis درست کار کند؛ متن کامل در title. dir=auto ترتیب متن مختلط فارسی/لاتین را حفظ می‌کند
    // اعداد: تراز انتها (چپ در RTL) با ارقام هم‌عرض تا رقم‌ها زیر هم قرار بگیرند
    return (
      <span
        data-measure
        dir="auto"
        title={text}
        className={cn(
          "block truncate text-sm",
          isNumeric ? "text-end tabular-nums" : "text-start",
        )}
      >
        {text}
      </span>
    );
  };

  /** کلاس‌های مشترک سلول‌ها (هدر، فیلتر، بدنه) برای نسخه grid */
  const gridCellClass = isGrid ? "border-l border-border last:border-l-0" : "";

  const renderActions = (row: TData) => (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center justify-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {renderRowActions ? (
          renderRowActions(row)
        ) : (
          <>
            {permissions.view && onView && (
              <RowActionButton label="مشاهده جزئیات" onClick={() => onView(row)}>
                <Eye size={15} />
              </RowActionButton>
            )}
            {permissions.edit && onEdit && (
              <RowActionButton label="ویرایش" onClick={() => onEdit(row)}>
                <Pencil size={15} />
              </RowActionButton>
            )}
            {permissions.delete && onDelete && (
              <RowActionButton label="حذف" destructive onClick={() => onDelete(row)}>
                <Trash2 size={15} />
              </RowActionButton>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );

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

      {isMobile ? (
        <DataTableMobileCards
          columns={columns}
          data={data}
          isLoading={isLoading}
          pageSize={pagination.pageSize}
          selectedRowId={selectedRowId}
          renderCell={renderCell}
          renderActions={renderActions}
          onOpen={(row) => {
            setSelectedRowId(row.id);
            handleRowDoubleClick(row);
          }}
        />
      ) : (
      <div className="flex-1 min-h-0 rounded-xl border border-border shadow-sm bg-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table ref={tableRef} style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="border-b border-border hover:bg-transparent even:bg-transparent">
                {columns.map((column) => {
                  const width = widthOf(column.key);
                  const isSorted = sortConfig?.key === column.key;
                  return (
                    <Resizable
                      key={column.key}
                      width={width}
                      height={0}
                      onResize={(_e, { size }) => setWidth(column.key, size.width)}
                      axis="x"
                      // در RTL انتهای ستون لبه چپ است؛ دستگیره w کشیدن به چپ را افزایش عرض حساب می‌کند
                      resizeHandles={["w"]}
                      minConstraints={[minWidthOf(column.key), 0]}
                      maxConstraints={[600, Infinity]}
                      handle={(_axis, ref) => (
                        <ColumnResizeHandle
                          ref={ref}
                          label={column.label}
                          width={width}
                          minWidth={minWidthOf(column.key)}
                          onWidthChange={(w) => setWidth(column.key, w)}
                          onAutoFit={() => autoFitColumn(column.key)}
                        />
                      )}
                    >
                      <TableHead
                        data-col-key={column.key}
                        aria-sort={
                          column.sortable === false
                            ? undefined
                            : isSorted
                              ? sortConfig?.direction
                              : "none"
                        }
                        style={{ width: `${width}px` }}
                        className={cn(
                          "h-9 bg-muted bg-none px-3 text-start",
                          gridCellClass,
                        )}
                      >
                        <DataTableColumnHeader
                          column={column}
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          filter={advancedFilters.find((f) => f.key === column.key)}
                          onFilterChange={onAdvancedFilterChange}
                        />
                      </TableHead>
                    </Resizable>
                  );
                })}
                {/* ستون عملیات */}
                <TableHead
                  className="no-print h-9 bg-muted bg-none text-center text-xs font-medium text-muted-foreground"
                  style={{ width: `${ACTIONS_WIDTH}px` }}
                >
                  عملیات
                </TableHead>
              </TableRow>

              <TableRow className="no-print bg-card hover:bg-card even:bg-card border-b border-border sticky top-[36px] z-10">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    style={{
                      width: `${widthOf(column.key)}px`,
                      maxWidth: `${widthOf(column.key)}px`,
                    }}
                    className={cn("py-1.5", gridCellClass)}
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
                            width: `${widthOf(column.key)}px`,
                            maxWidth: `${widthOf(column.key)}px`,
                          }}
                          className={cn("py-1.5 px-3", gridCellClass)}
                        >
                          <div className="h-5 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                      <TableCell
                        className="no-print text-center"
                        style={{ width: `${ACTIONS_WIDTH}px` }}
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
                    data-row-index={index}
                    tabIndex={
                      selectedRowId === row.id ||
                      (index === 0 && !data.some((r) => r.id === selectedRowId))
                        ? 0
                        : -1
                    }
                    aria-selected={selectedRowId === row.id}
                    onKeyDown={(e) => handleRowKeyDown(e, row)}
                    onClick={() => handleRowClick(row)}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    onContextMenu={(e) => handleContextMenu(e, row)}
                    className={cn(
                      "cursor-pointer border-b border-border transition-colors h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      // راه‌راه فقط در نسخه grid؛ نسخه پیش‌فرض ردیف‌های یکدست (سبک Fiori)
                      !isGrid && "even:bg-transparent",

                      // ۱. حالت انتخاب شده (بالاترین اولویت)
                      selectedRowId === row.id
                        ? "!bg-primary/10 hover:!bg-primary/15"
                        : // ۲. حالت غیرفعال (isActive === false)
                        row.isActive === false
                        ? "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        : // ۳. حالت عادی
                          "hover:bg-muted/50"
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        data-col-key={column.key}
                        style={{
                          width: `${widthOf(column.key)}px`,
                          maxWidth: `${widthOf(column.key)}px`,
                        }}
                        className={cn("py-1.5 px-3", gridCellClass)}
                      >
                        {renderCell(column, row)}
                      </TableCell>
                    ))}

                    <TableCell
                      className="no-print text-center"
                      style={{ width: `${ACTIONS_WIDTH}px` }}
                    >
                      {renderActions(row)}
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
                      {activeFiltersCount > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            فیلترهای فعلی هیچ ردیفی را نشان نمی‌دهند.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearAllFilters}
                            className="mt-1 h-8 gap-1.5"
                          >
                            <FilterX className="h-3.5 w-3.5" />
                            پاک کردن فیلترها
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          هنوز اطلاعاتی ثبت نشده است.
                        </p>
                      )}
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
          {/* لنگر نامرئی منو در محل کلیک؛ button است چون Radix ویژگی‌های دکمه را روی trigger می‌گذارد */}
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none size-0 opacity-0"
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
                    <Eye className="w-4 h-4 text-muted-foreground" />
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
                    <Pencil className="w-4 h-4 text-muted-foreground" />
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

      )}

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

function RowActionButton({
  label,
  destructive,
  onClick,
  children,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "h-7 w-7 text-muted-foreground",
            destructive
              ? "hover:bg-destructive/10 hover:text-destructive"
              : "hover:bg-primary/10 hover:text-primary",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
