"use client";

import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import PermissionGuard from "@/components/ui/PermissionGuard";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import { useTabs } from "@/providers/TabsProvider";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import inventoryService from "@/services/inventoryService";
import type { StockCountListItemDto } from "@/types/api";
import type { ColumnConfig } from "@/types";
import StockCountStatusBadge from "./components/StockCountStatusBadge";
import StartStockCountDialog from "./components/StartStockCountDialog";

const columns: ColumnConfig[] = [
  {
    key: "id",
    title: "شماره",
    label: "شماره",
    type: "number",
    width: 80,
    mobile: "title",
  },
  {
    key: "countDate",
    title: "تاریخ شمارش",
    label: "تاریخ شمارش",
    type: "string",
    render: (date: string) => (
      <span dir="ltr">{new Date(date).toLocaleDateString("fa-IR")}</span>
    ),
  },
  { key: "warehouseTitle", title: "انبار", label: "انبار", type: "string" },
  {
    key: "statusId",
    title: "وضعیت",
    label: "وضعیت",
    type: "custom",
    render: (_: number, row: StockCountListItemDto) => (
      <StockCountStatusBadge statusId={row.statusId} title={row.statusTitle} />
    ),
  },
  {
    key: "countedLines",
    title: "پیشرفت شمارش",
    label: "پیشرفت شمارش",
    type: "number",
    render: (_: number, row: StockCountListItemDto) => (
      <span className="font-mono text-xs" dir="ltr">
        {row.countedLines} / {row.lineCount}
      </span>
    ),
  },
  {
    key: "description",
    title: "توضیحات",
    label: "توضیحات",
    type: "string",
    render: (v: string) => (
      <span
        className="block max-w-[200px] truncate text-xs text-muted-foreground"
        title={v}
      >
        {v}
      </span>
    ),
  },
];

export default function StockCountsPage() {
  const { addTab } = useTabs();
  const [starting, setStarting] = useState(false);
  const { tableProps, refresh, totalCount } =
    useServerDataTable<StockCountListItemDto>({
      fetcher: inventoryService.searchStockCounts,
      initialPageSize: 20,
    });

  const open = (row: StockCountListItemDto) =>
    addTab(`انبارگردانی ${row.id}`, `/inventory/stock-counts/${row.id}`);

  const actions = (
    <PermissionGuard permission="Inventory.StockCounts.Create">
      <Button
        onClick={() => setStarting(true)}
        size="sm"
        className="h-8 gap-1.5"
      >
        <Plus size={16} />
        <span className="sr-only text-xs sm:not-sr-only">شروع انبارگردانی</span>
      </Button>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission="Inventory.StockCounts.View">
      <BaseListLayout
        title="انبارگردانی"
        description="شمارش موجودی انبار و صدور اسناد اصلاحی اضافی و کسری"
        icon={ClipboardCheck}
        count={totalCount}
        actions={actions}
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable
            columns={columns}
            {...tableProps}
            onView={open}
            onEdit={open}
            onRowDoubleClick={open}
          />
        </div>
      </BaseListLayout>
      <StartStockCountDialog
        open={starting}
        onClose={() => setStarting(false)}
        onStarted={(id) => {
          setStarting(false);
          refresh();
          addTab(`انبارگردانی ${id}`, `/inventory/stock-counts/${id}`);
        }}
      />
    </ProtectedPage>
  );
}
