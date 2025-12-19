import * as XLSX from "xlsx";
import type { ColumnConfig } from "@/types";

interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeFilters?: boolean;
}

export function exportToExcel<TData extends Record<string, any>>(
  data: TData[],
  columns: ColumnConfig[],
  options: ExportOptions = {}
) {
  const {
    filename = `export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName = "Sheet1",
    includeFilters = false,
  } = options;

  // تبدیل داده‌ها به فرمت مناسب اکسل
  const exportData = data.map((row) => {
    const exportRow: Record<string, any> = {};

    columns.forEach((column) => {
      const value = row[column.key];

      // مدیریت انواع داده‌های مختلف
      if (column.type === "boolean") {
        exportRow[column.label] = value ? "فعال" : "غیرفعال";
      } else if (column.type === "date" && value) {
        // تبدیل تاریخ به فرمت قابل خواندن
        exportRow[column.label] = new Date(value).toLocaleDateString("fa-IR");
      } else if (value === null || value === undefined) {
        exportRow[column.label] = "";
      } else {
        exportRow[column.label] = value;
      }
    });

    return exportRow;
  });

  // ایجاد workbook
  const wb = XLSX.utils.book_new();

  // ایجاد worksheet از داده‌ها
  const ws = XLSX.utils.json_to_sheet(exportData);

  // تنظیم عرض ستون‌ها به صورت خودکار
  const columnWidths = columns.map((col) => ({
    wch: Math.max(col.label.length + 5, 15),
  }));
  ws["!cols"] = columnWidths;

  // اضافه کردن worksheet به workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // دانلود فایل
  XLSX.writeFile(wb, filename);
}

// تابع export با فیلترهای اعمال شده
export function exportFilteredToExcel<TData extends Record<string, any>>(
  data: TData[],
  columns: ColumnConfig[],
  filters: {
    globalFilter?: string;
    columnFilters?: Record<string, string>;
    advancedFilters?: any[];
  },
  options: ExportOptions = {}
) {
  const {
    filename = `filtered_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName = "داده‌های فیلتر شده",
  } = options;

  // ایجاد workbook
  const wb = XLSX.utils.book_new();

  // صفحه اول: داده‌های فیلتر شده
  const exportData = data.map((row) => {
    const exportRow: Record<string, any> = {};
    columns.forEach((column) => {
      const value = row[column.key];
      if (column.type === "boolean") {
        exportRow[column.label] = value ? "فعال" : "غیرفعال";
      } else if (column.type === "date" && value) {
        exportRow[column.label] = new Date(value).toLocaleDateString("fa-IR");
      } else {
        exportRow[column.label] = value ?? "";
      }
    });
    return exportRow;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const columnWidths = columns.map((col) => ({
    wch: Math.max(col.label.length + 5, 15),
  }));
  ws["!cols"] = columnWidths;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // صفحه دوم: اطلاعات فیلترها (اختیاری)
  if (
    filters.globalFilter ||
    Object.keys(filters.columnFilters || {}).length > 0
  ) {
    const filterInfo = [];

    if (filters.globalFilter) {
      filterInfo.push({
        "نوع فیلتر": "جستجوی سراسری",
        مقدار: filters.globalFilter,
      });
    }

    Object.entries(filters.columnFilters || {}).forEach(([key, value]) => {
      const column = columns.find((col) => col.key === key);
      if (column && value) {
        filterInfo.push({
          "نوع فیلتر": `فیلتر ستون: ${column.label}`,
          مقدار: value,
        });
      }
    });

    if (filterInfo.length > 0) {
      const wsFilters = XLSX.utils.json_to_sheet(filterInfo);
      XLSX.utils.book_append_sheet(wb, wsFilters, "فیلترهای اعمال شده");
    }
  }

  // دانلود فایل
  XLSX.writeFile(wb, filename);
}
