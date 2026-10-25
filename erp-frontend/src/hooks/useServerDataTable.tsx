// hooks/useServerDataTable.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { handleApiError, toApiError } from "@/lib/error-handling";
import { SortConfig, ColumnFilter as AdvancedColumnFilter } from "@/types";
import type { FilterModel, Paged } from "@/types/api";

/** بدنه استاندارد درخواست فهرست صفحه‌بندی‌شده که این hook می‌سازد */
export interface ServerTableQuery {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  sortColumn?: string;
  sortDescending: boolean;
  filters: FilterModel[];
  [extra: string]: unknown;
}

/** تابع سرویس که یک صفحه از داده را برمی‌گرداند (آدرس API فقط در سرویس است) */
export type ServerTableFetcher<TData> = (
  query: ServerTableQuery,
  signal?: AbortSignal,
) => Promise<Paged<TData>>;

interface UseServerDataTableProps<TData> {
  fetcher: ServerTableFetcher<TData>;
  initialPageSize?: number;
  /** پارامترهای اضافه (مثل انبار انتخاب‌شده) که به بدنه درخواست اضافه می‌شوند */
  extraPayload?: Record<string, unknown>;
}

export function useServerDataTable<TData>(props: UseServerDataTableProps<TData>) {
  const { fetcher, initialPageSize = 10, extraPayload } = props;

  // --- States ---
  const [data, setData] = useState<TData[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [sorting, setSorting] = useState<SortConfig>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [advancedFilters, setAdvancedFilters] = useState<
    AdvancedColumnFilter[]
  >([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // تبدیل extraPayload به استرینگ برای جلوگیری از حلقه بی‌نهایت رندر در useCallback
  const extraPayloadString = JSON.stringify(extraPayload || {});

  // --- Fetch Logic ---
  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const advancedFilterPayload = advancedFilters.flatMap((f) =>
        f.conditions
          .filter((c) => c.value !== "" && c.value !== null)
          .map((c) => ({
            propertyName: f.key,
            operation: c.operator,
            value: String(c.value),
            logic: f.logic,
          })),
      );

      const simpleColumnFiltersPayload = Object.entries(columnFilters)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          propertyName: key,
          operation: "contains",
          value: String(value),
        }));

      // بازیابی پارامترهای اضافی
      const parsedExtraPayload = JSON.parse(extraPayloadString);

      const payload: ServerTableQuery = {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        searchTerm: globalFilter,
        sortColumn: sorting?.key,
        sortDescending: sorting?.direction === "descending",
        filters: [...advancedFilterPayload, ...simpleColumnFiltersPayload],
        // پارامترهای اضافی (مثل انبار و موجودی صفر)
        ...parsedExtraPayload,
      };

      const result = await fetcher(payload, controller.signal);
      setData(result?.items ?? []);
      setRowCount(result?.totalCount ?? 0);
    } catch (error) {
      if (toApiError(error).code === "cancelled") return;
      handleApiError(error, "خطا در دریافت اطلاعات");
      setData([]);
      setRowCount(0);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }, [
    fetcher,
    pagination,
    sorting,
    globalFilter,
    advancedFilters,
    columnFilters,
    extraPayloadString, // اضافه شدن به وابستگی‌ها
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGlobalFilterChange = (value: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setGlobalFilter(value);
  };

  const handleAdvancedFilterChange = (
    newFilter: AdvancedColumnFilter | null,
  ) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setAdvancedFilters((prev) => {
      if (!newFilter) return prev;
      const otherFilters = prev.filter((f) => f.key !== newFilter.key);
      if (newFilter.conditions.some((c) => c.value))
        return [...otherFilters, newFilter];
      return otherFilters;
    });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalFilter("");
    setAdvancedFilters([]);
    setColumnFilters({});
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return {
    tableProps: {
      data,
      rowCount,
      pageCount: Math.ceil(rowCount / pagination.pageSize),
      pagination,
      sortConfig: sorting,
      globalFilter,
      advancedFilters,
      columnFilters,
      isLoading,
      onGlobalFilterChange: handleGlobalFilterChange,
      onAdvancedFilterChange: handleAdvancedFilterChange,
      onColumnFilterChange: handleColumnFilterChange,
      onClearAllFilters: handleClearAllFilters,
      onPaginationChange: setPagination,
      onSortChange: setSorting,
    },
    refresh: fetchData,
    data,
    totalCount: rowCount,
  };
}
