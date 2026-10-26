"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Scale } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTabs } from "@/providers/TabsProvider";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { productionService } from "@/services/productionService";
import type { ProductionVarianceSummaryDto } from "@/types/api";
import type { ColumnConfig } from "@/types";
import ProductionOrderStatusBadge, { PRODUCTION_ORDER_STATUS } from "../orders/components/ProductionOrderStatusBadge";
import { VarianceBadge } from "../orders/components/ProductionProgressSection";

const qty = (v: number, row: ProductionVarianceSummaryDto) => (
  <span className="tabular-nums">
    {v.toLocaleString("fa-IR", { maximumFractionDigits: 4 })}{" "}
    <span className="text-xs text-muted-foreground">{row.unitName}</span>
  </span>
);

// ستون‌های محاسبه‌شده از اسناد انبار در بک‌اند مرتب‌سازی و فیلتر نمی‌شوند
const computed = { sortable: false, filterable: false } as const;

const columns: ColumnConfig[] = [
  { key: "orderNumber", label: "شماره سفارش", type: "string", width: 120, mobile: "title" },
  { key: "productCode", label: "کد کالا", type: "string" },
  { key: "productName", label: "کالا", type: "string" },
  { key: "quantity", label: "مقدار سفارش", type: "number", render: qty },
  { key: "goodQuantity", label: "محصول سالم", type: "number", ...computed, render: qty },
  { key: "scrapQuantity", label: "ضایعات", type: "number", ...computed, render: qty },
  {
    key: "yieldPercent",
    label: "بازده",
    type: "custom",
    ...computed,
    render: (v: number | null) => (v == null ? "-" : <span className="tabular-nums">{v.toLocaleString("fa-IR")}٪</span>),
  },
  {
    key: "overAllowedCount",
    label: "مواد بیش از مجاز",
    type: "custom",
    ...computed,
    render: (v: number, row: ProductionVarianceSummaryDto) => (
      <span className={v > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
        {v.toLocaleString("fa-IR")} از {row.materialCount.toLocaleString("fa-IR")}
      </span>
    ),
  },
  {
    key: "maxVariancePercent",
    label: "بیشترین انحراف",
    type: "custom",
    ...computed,
    render: (v: number | null, row: ProductionVarianceSummaryDto) =>
      v == null ? "-" : <VarianceBadge percent={v} overAllowed={row.overAllowedCount > 0} />,
  },
  {
    key: "statusId",
    label: "وضعیت",
    type: "custom",
    sortable: true,
    filterable: false,
    render: (_: number, row: ProductionVarianceSummaryDto) => (
      <span className="inline-flex items-center gap-1.5">
        <ProductionOrderStatusBadge statusId={row.statusId} title={row.statusTitle} />
        {row.hasOpenDocs && <span className="text-xs text-muted-foreground">(سند در جریان)</span>}
      </span>
    ),
  },
];

/** گزارش انحراف مقداری: مصرف قطعی مواد در برابر استاندارد فرمول برای مقدار تولیدشده */
export default function ProductionVariancePage() {
  const { addTab } = useTabs();
  const [status, setStatus] = useState<number | null>(null);
  const [overAllowedOnly, setOverAllowedOnly] = useState(false);

  const extraPayload = useMemo(() => ({ status, overAllowedOnly }), [status, overAllowedOnly]);
  const { tableProps, refresh, totalCount } = useServerDataTable<ProductionVarianceSummaryDto>({
    fetcher: productionService.searchVariance,
    initialPageSize: 20,
    extraPayload,
  });

  const open = (row: ProductionVarianceSummaryDto) =>
    addTab(`سفارش تولید ${row.orderNumber}`, `/production/orders/${row.id}`);

  const actions = (
    <div className="flex w-full flex-row items-center justify-end gap-1.5 sm:gap-2">
      <div className="flex items-center gap-2">
        <Switch id="over-only" checked={overAllowedOnly} onCheckedChange={setOverAllowedOnly} />
        <Label htmlFor="over-only" className="text-xs">
          فقط بیش از مجاز
        </Label>
      </div>
      <Select value={status ? String(status) : "all"} onValueChange={(v) => setStatus(v === "all" ? null : Number(v))}>
        <SelectTrigger aria-label="وضعیت" className="h-8 w-[130px] shrink-0 bg-background text-xs">
          <SelectValue placeholder="همه وضعیت‌ها" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          <SelectItem value={String(PRODUCTION_ORDER_STATUS.inProgress)}>در حال تولید</SelectItem>
          <SelectItem value={String(PRODUCTION_ORDER_STATUS.completed)}>تکمیل شده</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={refresh} variant="outline" size="icon" className="h-8 w-8 shrink-0" title="بروزرسانی" aria-label="بروزرسانی">
        <RefreshCw size={14} className="text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <ProtectedPage permission="Production.Orders">
      <BaseListLayout
        title="انحراف مصرف مواد"
        description="مصرف قطعی مواد هر سفارش در برابر استاندارد فرمول برای مقدار تولیدشده (سالم + ضایعات)"
        icon={Scale}
        count={totalCount}
        actions={actions}
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable
            columns={columns}
            {...tableProps}
            onView={open}
            onRowDoubleClick={open}
            permissions={{ view: true, edit: false, delete: false }}
          />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
