"use client";

import React, { useMemo } from "react";
import { WarehouseDto } from "@/types/inventory";
import { ColumnConfig } from "@/types";
import { Warehouse, Plus } from "lucide-react";
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useTabs } from "@/providers/TabsProvider";
import { Button } from "@/components/ui/button";
import BaseListLayout from "@/components/layout/BaseListLayout";
import inventoryService from "@/services/inventoryService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function WarehousesPage() {
  const { addTab } = useTabs();

  // استفاده از هوک با نام صحیح متد refresh و اندپوینت درست بک‌اند
  const { tableProps, refresh, totalCount } = useServerDataTable<WarehouseDto>({
    endpoint: "/Inventory/Inventory/warehouses/list",
    initialPageSize: 20,
  });

  // تنظیم ستون‌ها مطابق با فیلدهای خروجی GetWarehousesQuery.cs
  const columns: ColumnConfig[] = useMemo(
    () => [
      { key: "code", label: "کد انبار", type: "string" },
      { key: "title", label: "عنوان انبار", type: "string" },
      { key: "type", label: "نوع انبار", type: "string" }, // فیلد TypeName از DTO
      {
        key: "address",
        label: "آدرس",
        type: "string",
        render: (val) => (
          <span className="truncate max-w-[250px] block text-xs" title={val}>
            {val || "---"}
          </span>
        ),
      },
      { key: "isActive", label: "وضعیت", type: "boolean" },
    ],
    [],
  );

  // عملیات‌ها (صدا زده شده توسط DataTable در آیکون‌ها و راست‌کلیک)
  const handleView = (row: WarehouseDto) => {
    addTab(`مشاهده ${row.title}`, `/inventory/warehouses/view/${row.id}`);
  };

  const handleEdit = (row: WarehouseDto) => {
    addTab(`ویرایش ${row.title}`, `/inventory/warehouses/edit/${row.id}`);
  };

  const handleDelete = async (row: WarehouseDto) => {
    if (!confirm(`آیا از حذف انبار "${row.title}" اطمینان دارید؟`)) return;

    try {
      // اصلاح خطا: ارسال هر دو آرگومان (id و rowVersion)
      // دقت کنید که row.rowVersion باید در DTO لیست شما وجود داشته باشد
      await inventoryService.deleteWarehouse(row.id, row.rowVersion);

      toast.success("انبار با موفقیت حذف شد");
      refresh(); // متد به‌روزرسانی در هوک شما
    } catch (error: any) {
      toast.error(
        "خطا در حذف انبار. ممکن است رکورد توسط دیگری تغییر یافته یا دارای تراکنش باشد.",
      );
    }
  };

  const headerActions = (
    <PermissionGuard permission="Inventory.Warehouses.Define">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() =>
                addTab("تعریف انبار جدید", "/inventory/warehouses/create")
              }
              size="sm"
              className="h-8 gap-1.5 md:gap-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">انبار جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] sm:hidden">
            انبار جدید
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission="Inventory.Warehouses.View">
      <BaseListLayout
        title="مدیریت انبارها"
        icon={Warehouse}
        actions={headerActions}
        count={totalCount}
      >
        <DataTable
          columns={columns}
          onView={handleView} // نمایش آیکون چشم و گزینه در راست‌کلیک
          onEdit={handleEdit} // نمایش آیکون مداد و گزینه در راست‌کلیک
          onDelete={handleDelete} // نمایش آیکون سطل زباله و گزینه در راست‌کلیک
          onRefresh={refresh}
          {...tableProps}
        />
      </BaseListLayout>
    </ProtectedPage>
  );
}
