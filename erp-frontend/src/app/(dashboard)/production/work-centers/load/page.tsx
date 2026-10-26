"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, RefreshCw } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useLocalDataTable } from "@/hooks/useLocalDataTable";
import { workCenterService } from "@/services/productionService";
import { handleApiError } from "@/lib/error-handling";
import type { WorkCenterLoadDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string", width: 110 },
  { key: "title", label: "مرکز کاری", type: "string", mobile: "title" },
  { key: "hoursPerDay", label: "ظرفیت روزانه (ساعت)", type: "number", render: (v: number) => <span className="tabular-nums">{fmt(v)}</span> },
  { key: "openOrderCount", label: "سفارش‌های باز", type: "number", render: (v: number) => <span className="tabular-nums">{fmt(v)}</span> },
  { key: "operationCount", label: "عملیات در صف", type: "number", render: (v: number) => <span className="tabular-nums">{fmt(v)}</span> },
  {
    key: "remainingMinutes",
    label: "کار باقی‌مانده (ساعت)",
    type: "number",
    render: (v: number) => <span className="tabular-nums">{fmt(v / 60)}</span>,
  },
  {
    key: "loadDays",
    label: "بار (روز کاری)",
    type: "number",
    render: (v: number) => (
      <StatusBadge tone={v === 0 ? "neutral" : v > 5 ? "warning" : "info"} icon={false} label={`${fmt(v)} روز`} />
    ),
  },
];

/** بار مراکز کاری: کار باقی‌مانده عملیات سفارش‌های باز تقسیم بر ظرفیت روزانه */
export default function WorkCenterLoadPage() {
  const [rows, setRows] = useState<(WorkCenterLoadDto & { id: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await workCenterService.load());
    } catch (error) {
      handleApiError(error, "خطا در دریافت بار مراکز کاری");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { tableProps, totalCount } = useLocalDataTable(rows, { isLoading: loading });

  return (
    <ProtectedPage permission="Production.WorkCenters">
      <BaseListLayout
        title="بار مراکز کاری"
        description="کار باقی‌مانده سفارش‌های تأییدشده و در حال تولید، بر اساس مسیر تولید و گزارش‌های کارکرد"
        icon={Gauge}
        count={totalCount}
        actions={
          <Button onClick={load} variant="outline" size="icon" className="h-8 w-8" aria-label="بروزرسانی" title="بروزرسانی">
            <RefreshCw size={14} className="text-muted-foreground" />
          </Button>
        }
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable columns={columns} {...tableProps} permissions={{ view: false, edit: false, delete: false }} />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
