"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import inventoryService from "@/services/inventoryService";
import { companyService } from "@/services/baseInfoService";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { handleApiError } from "@/lib/error-handling";
import type { CompanyDto, StockValuationDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const rial = (v: number) => <span className="tabular-nums">{Math.round(v).toLocaleString("fa-IR")}</span>;

const columns: ColumnConfig[] = [
  { key: "productCode", label: "کد کالا", type: "string", width: 120 },
  { key: "productName", label: "کالا", type: "string", mobile: "title" },
  { key: "companyTitle", label: "شرکت", type: "string" },
  // فقط در سطح «انبار» پر است
  { key: "warehouseTitle", label: "انبار", type: "string", render: (v: string | null) => v ?? "همه انبارها" },
  {
    key: "quantity",
    label: "مقدار",
    type: "number",
    render: (v: number, row: StockValuationDto) => (
      <span className="tabular-nums">
        {v.toLocaleString("fa-IR", { maximumFractionDigits: 3 })} <span className="text-xs text-muted-foreground">{row.unitName}</span>
      </span>
    ),
  },
  {
    key: "averageCost",
    label: "بهای میانگین (ریال)",
    type: "number",
    sortable: false,
    filterable: false,
    render: (v: number) => <span className="tabular-nums">{v.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}</span>,
  },
  { key: "value", label: "ارزش (ریال)", type: "number", render: rial },
];

/** ارزش ریالی موجودی بر اساس میانگین موزون متحرک (سطح شرکت یا انبار طبق تنظیمات) */
export default function StockValuationPage() {
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    companyService
      .lookup()
      .then(setCompanies)
      .catch((error) => handleApiError(error, "خطا در دریافت شرکت‌ها"));
  }, []);

  const extraPayload = useMemo(() => ({ companyId }), [companyId]);
  const { tableProps, refresh, totalCount } = useServerDataTable<StockValuationDto>({
    fetcher: inventoryService.getStockValuation,
    initialPageSize: 30,
    extraPayload,
  });

  const actions = (
    <div className="flex w-full flex-row items-center justify-end gap-1.5 sm:gap-2">
      <Select value={companyId ? String(companyId) : "all"} onValueChange={(v) => setCompanyId(v === "all" ? null : Number(v))}>
        <SelectTrigger aria-label="شرکت" className="h-8 w-[160px] shrink-0 bg-background text-xs">
          <SelectValue placeholder="همه شرکت‌ها" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه شرکت‌ها</SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={refresh} variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="بروزرسانی" title="بروزرسانی">
        <RefreshCw size={14} className="text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <ProtectedPage permission="Inventory.Reports.Valuation">
      <BaseListLayout
        title="ارزش ریالی موجودی"
        description="مقدار، بهای میانگین و ارزش هر کالا طبق روش و سطح تنظیمات ارزش‌گذاری"
        icon={Coins}
        count={totalCount}
        actions={actions}
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable columns={columns} {...tableProps} permissions={{ view: false, edit: false, delete: false }} />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
