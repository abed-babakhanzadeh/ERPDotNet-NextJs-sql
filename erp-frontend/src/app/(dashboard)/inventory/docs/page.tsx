"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus, Eye, Trash2, Pencil } from "lucide-react";

// Components
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Hooks & Types
import { useServerDataTable } from "@/hooks/useServerDataTable";
import inventoryService from "@/services/inventoryService";
import {
  InventoryDocDto,
  InventoryDocStatus,
  InventoryDocStatusMap,
} from "@/types/inventory";
import { ColumnConfig, ColumnFilter } from "@/types";

export default function InventoryDocsPage() {
  const router = useRouter();

  // 1. فراخوانی هوک با Endpoint رشته‌ای (طبق فایل useServerDataTable شما)
  const { tableProps, refresh } = useServerDataTable<InventoryDocDto>({
    endpoint: "/Inventory/Inventory/docs",
    initialPageSize: 10,
  });

  // 2. تعریف ستون‌ها
  const columns = useMemo<ColumnConfig[]>(
    () => [
      {
        key: "docNumber",
        label: "شماره سند",
        type: "number",
        render: (val, row) => (
          <span className="font-mono font-bold">{val}</span>
        ),
      },
      {
        key: "docTypeTitle",
        label: "نوع سند",
        type: "string",
      },
      {
        key: "warehouseTitle",
        label: "انبار",
        type: "string",
      },
      {
        key: "docDate",
        label: "تاریخ",
        type: "date", // کامپوننت DataTable شما تاریخ را خودش هندل می‌کند
      },
      {
        key: "status",
        label: "وضعیت",
        type: "number", // برای فیلتر
        render: (val: number) => {
          const status = InventoryDocStatusMap[val];
          return (
            <Badge
              variant={status?.variant || "outline"}
              className={`whitespace-nowrap ${status?.color}`}
            >
              {status?.label || "ناشناخته"}
            </Badge>
          );
        },
      },
      {
        key: "description",
        label: "توضیحات",
        type: "string",
        render: (val: string) => (
          <span
            className="truncate max-w-[150px] inline-block text-muted-foreground text-xs"
            title={val}
          >
            {val}
          </span>
        ),
      },
    ],
    [],
  );

  // 3. هندلر حذف
  const handleDelete = async (row: InventoryDocDto) => {
    if (row.status === InventoryDocStatus.Posted) {
      toast.error("حذف سند قطعی شده امکان‌پذیر نیست.");
      return;
    }

    if (!confirm(`آیا از حذف سند شماره ${row.docNumber} اطمینان دارید؟`))
      return;

    try {
      await inventoryService.deleteDoc(row.id, row.rowVersion);
      toast.success("سند با موفقیت حذف شد");
      refresh(); // رفرش لیست
    } catch (error) {
      console.error(error);
      // خطا توسط اینترسپتور apiClient هندل و نمایش داده می‌شود
    }
  };

  // 4. دکمه افزودن (هدر)
  const headerActions = (
    <PermissionGuard permission="Inventory.Docs.Create">
      <Link href="/inventory/docs/create">
        <Button size="sm" className="gap-2 h-9">
          <Plus size={16} />
          سند جدید
        </Button>
      </Link>
    </PermissionGuard>
  );

  // 5. منوی راست کلیک (Context Menu)
  // 5. منوی راست کلیک (Context Menu)
  // اصلاح تایپ: row را any می‌گیریم تا با TableRow کامپوننت تداخل نکند
  const renderContextMenu = (row: any, close: () => void) => {
    // اینجا به سیستم می‌گوییم که مطمئنیم این row از نوع سند انبار است
    const doc = row as InventoryDocDto;

    const isLocked = doc.status === InventoryDocStatus.Posted;

    return (
      <>
        <DropdownMenuItem
          onClick={() => router.push(`/inventory/docs/${doc.id}`)}
        >
          <Eye className="w-4 h-4 ml-2 text-blue-500" />
          مشاهده / ویرایش
        </DropdownMenuItem>

        {!isLocked && (
          <PermissionGuard permission="Inventory.Docs.Delete">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                handleDelete(doc);
                close();
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف سند
            </DropdownMenuItem>
          </PermissionGuard>
        )}
      </>
    );
  };

  return (
    <ProtectedPage permission="Inventory.Docs">
      <BaseListLayout
        title="مدیریت اسناد انبار"
        icon={FileText}
        actions={headerActions}
        count={tableProps.rowCount}
      >
        <DataTable
          // مپ کردن دستی پراپرتی‌ها برای رفع تداخل نام‌گذاری
          columns={columns}
          data={tableProps.data}
          isLoading={tableProps.isLoading} // مپ isLoading به loading
          pagination={tableProps.pagination}
          onPaginationChange={tableProps.onPaginationChange}
          pageCount={tableProps.pageCount}
          rowCount={tableProps.rowCount}
          sortConfig={tableProps.sortConfig} // مپ sortConfig
          onSortChange={tableProps.onSortChange} // مپ onSortChange
          globalFilter={tableProps.globalFilter}
          onGlobalFilterChange={tableProps.onGlobalFilterChange}
          // ستون فیلترها (اگر کامپوننت ساپورت کند)
          columnFilters={tableProps.columnFilters}
          onColumnFilterChange={tableProps.onColumnFilterChange}
          onRefresh={refresh}
          // اکشن‌های ردیف
          renderRowActions={(row) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/inventory/docs/${row.id}`)}
                  >
                    {row.status === InventoryDocStatus.Draft ? (
                      <Pencil className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-blue-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {row.status === InventoryDocStatus.Draft
                    ? "ویرایش"
                    : "مشاهده"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          renderContextMenu={renderContextMenu}
          advancedFilters={[]}
          onAdvancedFilterChange={function (
            newFilter: ColumnFilter | null,
          ): void {
            throw new Error("Function not implemented.");
          }}
          onClearAllFilters={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      </BaseListLayout>
    </ProtectedPage>
  );
}
