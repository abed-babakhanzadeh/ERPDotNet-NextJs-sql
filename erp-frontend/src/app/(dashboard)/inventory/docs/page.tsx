"use client";

import React, { useMemo } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle, FileOutput } from "lucide-react";
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

import { useTabs } from "@/providers/TabsProvider";
import inventoryService from "@/services/inventoryService";
import { useServerDataTable } from "@/hooks/useServerDataTable"; // ✅ استفاده صحیح
import {
  InventoryDocDto,
  InventoryDocStatus,
  InventoryNature,
} from "@/types/inventory";
import { ColumnConfig } from "@/types";

const statusMap: Record<
  number,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    className?: string;
  }
> = {
  [InventoryDocStatus.Draft]: {
    label: "پیش‌نویس",
    variant: "secondary",
    className: "bg-slate-100 text-slate-600",
  },
  [InventoryDocStatus.InProcess]: {
    label: "در جریان بررسی",
    variant: "outline",
    className: "border-blue-200 text-blue-600 bg-blue-50",
  },
  [InventoryDocStatus.RequiresRevision]: {
    label: "نیازمند اصلاح",
    variant: "outline",
    className: "border-orange-200 text-orange-600 bg-orange-50",
  },
  [InventoryDocStatus.Approved]: {
    label: "تایید شده",
    variant: "outline",
    className: "border-emerald-200 text-emerald-600 bg-emerald-50",
  },
  [InventoryDocStatus.Rejected]: {
    label: "رد شده",
    variant: "destructive",
    className: "",
  },
  [InventoryDocStatus.Posted]: {
    label: "قطعی شده",
    variant: "default",
    className: "bg-emerald-600 hover:bg-emerald-700",
  },
  [InventoryDocStatus.Cancelled]: {
    label: "ابطال شده",
    variant: "destructive",
    className: "bg-red-100 text-red-700 hover:bg-red-200",
  },
};

export default function InventoryDocsListPage() {
  const { addTab } = useTabs();

  // ✅ 1. استفاده خالص از هوک (بدون بازنویسی دستی)
  const { tableProps, refresh, totalCount } =
    useServerDataTable<InventoryDocDto>({
      endpoint: "/Inventory/Inventory/docs/search",
      initialPageSize: 10,
    });

  // 2. ستون‌ها
  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "nature",
        label: "نوع",
        title: "نوع سند",
        type: "custom",
        width: 60,
        render: (_: any, row: InventoryDocDto) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.nature === InventoryNature.Input ? (
                  <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {row.nature === InventoryNature.Input
                  ? "وارده (رسید)"
                  : "صادره (حواله)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        key: "status",
        label: "وضعیت",
        title: "وضعیت سند",
        type: "custom",
        width: 100,
        render: (value: number) => {
          const status = statusMap[value] || {
            label: "نامشخص",
            variant: "secondary",
          };
          return (
            <Badge
              variant={status.variant}
              className={`font-normal text-xs ${status.className || ""}`}
            >
              {status.label}
            </Badge>
          );
        },
      },
      {
        key: "docNumber",
        label: "شماره سند",
        title: "شماره سند",
        type: "string", // مهم: تایپ string باشد تا فیلتر متنی فعال شود
        sortable: true,
      },
      {
        key: "docDate",
        label: "تاریخ",
        title: "تاریخ سند",
        type: "string", // مهم: تایپ string باشد تا کاربر بتواند تاریخ شمسی تایپ کند
        sortable: true,
        render: (date: string) => (
          <span dir="ltr">{new Date(date).toLocaleDateString("fa-IR")}</span>
        ),
      },
      {
        key: "docTypeTitle",
        label: "نوع سند",
        title: "نوع سند",
        type: "string",
      },
      { key: "warehouseTitle", label: "انبار", title: "انبار", type: "string" },
      {
        key: "targetPartyName",
        label: "طرف حساب",
        title: "طرف حساب",
        type: "string",
      },
      {
        key: "description",
        label: "توضیحات",
        title: "توضیحات",
        type: "string",
        render: (val: string) => (
          <span
            className="text-muted-foreground text-xs truncate max-w-[150px] block"
            title={val}
          >
            {val}
          </span>
        ),
      },
    ],
    [],
  );

  // 3. هندلرها
  const handleCreate = () => addTab("ثبت سند جدید", "/inventory/docs/create");
  const handleEdit = (row: InventoryDocDto) =>
    addTab(`ویرایش سند ${row.docNumber}`, `/inventory/docs/edit/${row.id}`);
  const handleView = (row: InventoryDocDto) =>
    addTab(
      `مشاهده سند ${row.docNumber}`,
      `/inventory/docs/edit/${row.id}?mode=view`,
    );
  const handleDelete = async (row: InventoryDocDto) => {
    if (row.status === InventoryDocStatus.Posted) {
      toast.error("امکان حذف سند قطعی شده وجود ندارد.");
      return;
    }
    if (!confirm(`آیا از حذف سند شماره ${row.docNumber} اطمینان دارید؟`))
      return;
    try {
      await inventoryService.deleteDoc(row.id, row.rowVersion);
      toast.success("سند حذف شد");
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در حذف");
    }
  };

  const headerActions = (
    <PermissionGuard permission="Inventory.Docs.Create">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreate}
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">سند جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>ثبت سند جدید</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission="Inventory.Docs.View">
      <BaseListLayout
        title="اسناد انبار"
        description="مدیریت رسیدها، حواله‌ها و نقل و انتقالات"
        icon={FileOutput}
        count={totalCount}
        actions={headerActions}
      >
        <div className="bg-card rounded-md border h-[calc(100vh-180px)]">
          {/* ✅ پاس دادن مستقیم tableProps بدون دخالت دستی در فیلترها */}
          <DataTable
            columns={columns}
            {...tableProps}
            onView={handleView}
            onRowDoubleClick={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
