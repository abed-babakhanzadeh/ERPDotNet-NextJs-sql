"use client";

import React, { useMemo } from "react";
import { Unit, ColumnConfig } from "@/types";
import apiClient from "@/services/apiClient";
import { Plus, Ruler } from "lucide-react";
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useTabs } from "@/providers/TabsProvider";
import { Badge } from "@/components/ui/badge";
import { useTabPrefetch } from "@/hooks/useTabPrefetch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// 1. ایمپورت کردن لایوت جدید
import BaseListLayout from "@/components/layout/BaseListLayout";

const PlaceholderWrapper: React.FC<{
  children: React.ReactNode;
  permission?: string;
  title?: string;
  icon?: any;
  actions?: React.ReactNode;
}> = ({ children }) => <div>{children}</div>;

const ProtectedPagePlaceholder = ProtectedPage || PlaceholderWrapper;
const PermissionGuardPlaceholder =
  PermissionGuard || (({ children }) => <>{children}</>);

export default function UnitsPage() {
  const { addTab } = useTabs();

  useTabPrefetch(["/base-info/units/create"]);

  const { tableProps, refresh, totalCount } = useServerDataTable<Unit>({
    // totalCount اضافه شد
    endpoint: "/BaseInfo/Units/search",
    initialPageSize: 30,
  });

  const columns: ColumnConfig[] = useMemo(
    () => [
      { key: "title", label: "عنوان واحد", type: "string" },
      { key: "symbol", label: "نماد", type: "string" },
      {
        key: "baseUnitName",
        label: "واحد پایه",
        type: "string",
        render: (value) =>
          value || <span className="text-muted-foreground text-xs">-</span>,
      },
      {
        key: "conversionFactor",
        label: "ضریب",
        type: "number",
        render: (value, row) =>
          row.baseUnitName ? (
            value
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        key: "isActive",
        label: "وضعیت",
        type: "boolean",
        render: (val) =>
          val ? (
            <Badge className="bg-emerald-500 hover:bg-emerald-600">فعال</Badge>
          ) : (
            <Badge variant="destructive">غیرفعال</Badge>
          ),
      },
    ],
    []
  );

  const handleDelete = async (row: Unit) => {
    if (!confirm(`آیا از حذف واحد "${row.title}" اطمینان دارید؟`)) return;
    try {
      await apiClient.delete(`/Units/${row.id}`);
      toast.success("واحد با موفقیت حذف شد");
      refresh();
    } catch (error: any) {
      toast.error("خطا در حذف واحد. ممکن است در کالاها استفاده شده باشد.");
    }
  };

  const handleCreate = () => {
    addTab("تعریف واحد جدید", "/base-info/units/create");
  };

  const handleEdit = (row: Unit) => {
    addTab(`ویرایش ${row.title}`, `/base-info/units/edit/${row.id}`);
  };

  // 2. تعریف دکمه‌های اکشن به صورت جداگانه برای پاس دادن به لایوت
  const headerActions = (
    <PermissionGuardPlaceholder permission="BaseInfo.Units.Create">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreate}
              size="sm"
              className="h-8 gap-1.5 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">واحد جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] sm:hidden">
            واحد جدید
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuardPlaceholder>
  );

  return (
    <ProtectedPagePlaceholder permission="BaseInfo.Units">
      {/* 3. استفاده از لایوت جدید */}
      <BaseListLayout
        title="مدیریت واحدها"
        icon={Ruler}
        actions={headerActions}
        count={totalCount} // اگر تعداد کل را دارید
      >
        <DataTable
          columns={columns}
          onEdit={(unit) => handleEdit(unit as Unit)}
          onDelete={handleDelete}
          {...tableProps}
        />
      </BaseListLayout>
    </ProtectedPagePlaceholder>
  );
}
