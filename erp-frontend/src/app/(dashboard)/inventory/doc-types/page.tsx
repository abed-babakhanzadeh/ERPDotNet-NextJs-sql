"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, CheckCircle2, XCircle, FileBadge } from "lucide-react";
import { toast } from "sonner";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import PermissionGuard from "@/components/ui/PermissionGuard";
import ProtectedPage from "@/components/ui/ProtectedPage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// استفاده از هوک مدیریت تب‌ها
import { useTabs } from "@/providers/TabsProvider";

import inventoryService from "@/services/inventoryService";
import {
  InventoryDocTypeDto,
  InventoryNature,
  InventoryNatureLabels,
  NumberingScopeLabels,
} from "@/types/inventory";
import { ColumnConfig, SortConfig, ColumnFilter } from "@/types";

export default function DocTypesListPage() {
  const router = useRouter();
  const { addTab } = useTabs(); // 1. فراخوانی هوک تب

  const [data, setData] = useState<InventoryDocTypeDto[]>([]);
  const [loading, setLoading] = useState(true);

  // === State های مورد نیاز DataTable ===
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [advancedFilters, setAdvancedFilters] = useState<ColumnFilter[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await inventoryService.getDocTypes();
      setData(result);
    } catch (error) {
      toast.error("خطا در دریافت لیست انواع سند");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (item: InventoryDocTypeDto) => {
    if (!confirm(`آیا از حذف نوع سند "${item.title}" اطمینان دارید؟`)) return;

    try {
      await inventoryService.deleteDocType(item.id, item.rowVersion);
      toast.success("حذف با موفقیت انجام شد");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در عملیات حذف");
    }
  };

  // 2. هندلر بازکردن فرم در تب جدید (Create & Edit)
  const handleCreate = () => {
    addTab("تعریف نوع سند جدید", "/inventory/doc-types/create");
  };

  const handleEdit = (row: InventoryDocTypeDto) => {
    addTab(`ویرایش سند: ${row.title}`, `/inventory/doc-types/edit/${row.id}`);
  };

  // === منطق فیلتر و سورت کلاینت ساید ===
  const processedData = useMemo(() => {
    let filtered = [...data];

    if (globalFilter) {
      const lower = globalFilter.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(lower),
      );
    }

    if (sortConfig) {
      filtered.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, globalFilter, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return processedData.slice(start, start + pagination.pageSize);
  }, [processedData, pagination]);

  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "title",
        label: "عنوان سند",
        type: "text",
        sortable: true,
        render: (value, row) => (
          <div className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-blue-500" />
            {value}
          </div>
        ),
      },
      {
        key: "nature",
        label: "ماهیت",
        type: "custom",
        sortable: true,
        render: (value, row: any) => {
          // تعیین رنگ بر اساس ماهیت
          const isInput = row.natureValue === InventoryNature.Input;

          return (
            <Badge
              variant={isInput ? "secondary" : "outline"}
              className={
                isInput
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" // سبز برای وارده
                  : "bg-amber-50 text-amber-700 border-amber-200" // زرد برای صادره/انتقال
              }
            >
              {/* خواندن متن از مپینگ استاندارد */}
              {InventoryNatureLabels[row.natureValue] || "ناشناخته"}
            </Badge>
          );
        },
      },
      {
        key: "numberingScope",
        label: "روش شماره‌گذاری", // عنوان کوتاه شد
        type: "custom",
        render: (value, row: any) => {
          // ✅ استفاده از مپینگ استاندارد
          return (
            <span className="text-muted-foreground text-sm">
              {NumberingScopeLabels[row.numberingScope] || "ناشناخته"}
            </span>
          );
        },
      },
      {
        key: "affectsCost",
        label: "ریالی",
        type: "boolean",
        render: (val) =>
          val ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-slate-300" />
          ),
      },
      {
        key: "isReferenceRequired",
        label: "عطف اجباری",
        type: "boolean",
        render: (val) =>
          val ? (
            <span className="text-xs font-bold text-blue-600">بله</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
    ],
    [],
  );

  // 3. تعریف دکمه‌های هدر مطابق استاندارد موبایل/دسکتاپ
  const headerActions = (
    <PermissionGuard permission="Inventory.DocTypes.Create">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreate} // استفاده از هندلر جدید
              size="sm"
              className="h-8 gap-1.5 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">نوع سند جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] sm:hidden">
            نوع سند جدید
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuard>
  );

  // 4. پیچیدن کل صفحه در ProtectedPage و استفاده از headerActions
  return (
    <ProtectedPage permission="Inventory.DocTypes.View">
      <BaseListLayout
        title="انواع اسناد انبار"
        description="تعریف و مدیریت انواع رسید و حواله و برگشتی‌ها"
        icon={FileBadge}
        count={data.length}
        actions={headerActions}
      >
        <div className="bg-card rounded-md border h-[calc(100vh-200px)]">
          <DataTable
            data={paginatedData}
            columns={columns}
            rowCount={processedData.length}
            pageCount={Math.ceil(processedData.length / pagination.pageSize)}
            pagination={pagination}
            sortConfig={sortConfig || { key: "id", direction: "ascending" }}
            globalFilter={globalFilter}
            advancedFilters={advancedFilters}
            columnFilters={columnFilters}
            isLoading={loading}
            // هندلرها
            onPaginationChange={setPagination}
            onSortChange={setSortConfig}
            onGlobalFilterChange={setGlobalFilter}
            onColumnFilterChange={(key, val) =>
              setColumnFilters((prev) => ({ ...prev, [key]: val }))
            }
            onAdvancedFilterChange={() => {}}
            onClearAllFilters={() => {
              setGlobalFilter("");
              setColumnFilters({});
            }}
            onRefresh={loadData}
            // اکشن‌ها (باز شدن ادیت در تب جدید)
            onEdit={(row) => handleEdit(row as InventoryDocTypeDto)}
            onDelete={(row) => handleDelete(row as InventoryDocTypeDto)}
          />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
