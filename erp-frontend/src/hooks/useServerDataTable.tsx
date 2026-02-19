// hooks/useServerDataTable.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { SortConfig, ColumnFilter as AdvancedColumnFilter } from "@/types";

interface UseServerDataTableProps {
  endpoint: string;
  initialPageSize?: number;
  // ✅ اضافه شدن فیلد extraPayload برای رفع خطای تایپ اسکریپت
  extraPayload?: Record<string, any>;
}

export function useServerDataTable<TData>(props: UseServerDataTableProps) {
  const { endpoint, initialPageSize = 10, extraPayload } = props;

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
            PropertyName: f.key,
            Operation: c.operator,
            Value: String(c.value),
            Logic: f.logic,
          })),
      );

      const simpleColumnFiltersPayload = Object.entries(columnFilters)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          PropertyName: key,
          Operation: "contains",
          Value: String(value),
        }));

      // بازیابی پارامترهای اضافی
      const parsedExtraPayload = JSON.parse(extraPayloadString);

      const payload = {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        searchTerm: globalFilter,
        sortColumn: sorting?.key,
        sortDescending: sorting?.direction === "descending",
        Filters: [...advancedFilterPayload, ...simpleColumnFiltersPayload],
        // ✅ تزریق پارامترهای اضافی (مثل انبار و موجودی صفر) به بادی درخواست
        ...parsedExtraPayload,
      };

      const response = await apiClient.post<any>(endpoint, payload, {
        signal: controller.signal,
      });

      if (response?.data?.items) {
        setData(response.data.items);
        setRowCount(response.data.totalCount);
      } else {
        setData([]);
        setRowCount(0);
      }
    } catch (error: any) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED")
        return;
      console.error("Fetch error:", error);
      toast.error("خطا در دریافت اطلاعات");
      setData([]);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }, [
    endpoint,
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
