"use client";

import { useState } from "react";
import { Factory, Plus } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import PermissionGuard from "@/components/ui/PermissionGuard";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import { useTabs } from "@/providers/TabsProvider";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { productionService } from "@/services/productionService";
import type { ProductionOrderListDto } from "@/types/api";
import type { ColumnConfig } from "@/types";
import ProductionOrderStatusBadge from "./components/ProductionOrderStatusBadge";
import ProductionOrderDialog from "./components/ProductionOrderDialog";

const date = (v: string | null) =>
  v ? <span dir="ltr">{new Date(v).toLocaleDateString("fa-IR")}</span> : <span className="text-muted-foreground">-</span>;

const columns: ColumnConfig[] = [
  { key: "orderNumber", label: "شماره", type: "string", width: 110, mobile: "title" },
  { key: "productCode", label: "کد کالا", type: "string" },
  { key: "productName", label: "کالا", type: "string" },
  {
    key: "quantity",
    label: "مقدار",
    type: "number",
    render: (v: number, row: ProductionOrderListDto) => (
      <span>
        {v.toLocaleString("fa-IR")} <span className="text-xs text-muted-foreground">{row.unitName}</span>
      </span>
    ),
  },
  {
    key: "bomTitle",
    label: "فرمول",
    type: "string",
    render: (v: string, row: ProductionOrderListDto) => `${v} (نسخه ${row.bomVersion})`,
  },
  { key: "plannedStartDate", label: "شروع برنامه", type: "date", render: date },
  { key: "plannedEndDate", label: "پایان برنامه", type: "date", render: date },
  {
    key: "statusId",
    label: "وضعیت",
    type: "custom",
    sortable: true,
    filterable: false,
    render: (_: number, row: ProductionOrderListDto) => (
      <ProductionOrderStatusBadge statusId={row.statusId} title={row.statusTitle} />
    ),
  },
];

export default function ProductionOrdersPage() {
  const { addTab } = useTabs();
  const [creating, setCreating] = useState(false);
  const { tableProps, refresh, totalCount } = useServerDataTable<ProductionOrderListDto>({
    fetcher: productionService.searchOrders,
    initialPageSize: 20,
  });

  const open = (id: number, number: string) => addTab(`سفارش تولید ${number}`, `/production/orders/${id}`);

  const actions = (
    <PermissionGuard permission="Production.Orders.Create">
      <Button onClick={() => setCreating(true)} size="sm" className="h-8 gap-1.5">
        <Plus size={16} />
        <span className="sr-only text-xs sm:not-sr-only">سفارش تولید جدید</span>
      </Button>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission="Production.Orders">
      <BaseListLayout
        title="سفارش‌های تولید"
        description="برنامه ساخت محصول با نسخه‌ای از فرمول و نیاز مواد آن"
        icon={Factory}
        count={totalCount}
        actions={actions}
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable
            columns={columns}
            {...tableProps}
            onView={(row: ProductionOrderListDto) => open(row.id, row.orderNumber)}
            onRowDoubleClick={(row: ProductionOrderListDto) => open(row.id, row.orderNumber)}
            permissions={{ view: true, edit: false, delete: false }}
          />
        </div>
      </BaseListLayout>
      <ProductionOrderDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false);
          refresh();
          productionService.getOrder(id).then((o) => open(o.id, o.orderNumber));
        }}
      />
    </ProtectedPage>
  );
}
