"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { SectionCard, SectionEmpty } from "@/components/common/SectionCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import inventoryService from "@/services/inventoryService";
import { formatNumber } from "@/lib/format";
import { InventoryDocStatus, InventoryDocStatusMap, type InventoryDocDto } from "@/types/inventory";

const SAMPLE = 200;

const BAR: Record<string, string> = {
  neutral: "bg-muted-foreground/40",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
};

/** توزیع وضعیت آخرین اسناد انبار (نمونه‌ی محدود، بدون endpoint گزارشی جدید) */
export function InventoryDocStatusChart() {
  const { data, isLoading, error } = useAsyncData((s) =>
    inventoryService.searchDocs({ pageNumber: 1, pageSize: SAMPLE, sortColumn: "docDate", sortDescending: true }, s),
  );

  const rows = useMemo(() => {
    const docs = (data?.items ?? []) as InventoryDocDto[];
    const counts = new Map<InventoryDocStatus, number>();
    for (const d of docs) counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
    const max = Math.max(1, ...Array.from(counts.values()));
    return (Object.keys(InventoryDocStatusMap).map(Number) as InventoryDocStatus[])
      .map((status) => ({ status, count: counts.get(status) ?? 0, ...InventoryDocStatusMap[status] }))
      .filter((r) => r.count > 0)
      .map((r) => ({ ...r, pct: (r.count / max) * 100 }));
  }, [data]);

  const total = data?.items.length ?? 0;

  return (
    <SectionCard title="وضعیت اسناد اخیر" icon={BarChart3}>
      {isLoading ? (
        <div className="space-y-3 p-4" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : error ? (
        <SectionEmpty icon={BarChart3} text={error} />
      ) : rows.length === 0 ? (
        <SectionEmpty icon={BarChart3} text="سندی برای نمایش نیست" />
      ) : (
        <div className="space-y-3 p-4">
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.status} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                <span className="truncate text-muted-foreground">{r.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className={`block h-full rounded-full ${BAR[r.tone]}`} style={{ width: `${r.pct}%` }} />
                </span>
                <span className="text-end font-medium tabular-nums">{formatNumber(r.count)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            بر اساس {formatNumber(total)} سند آخر
          </p>
        </div>
      )}
    </SectionCard>
  );
}
