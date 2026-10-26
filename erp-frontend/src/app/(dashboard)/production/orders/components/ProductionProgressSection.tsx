"use client";

import { FileText } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryDocStatusBadge } from "@/components/inventory/InventoryDocStatusBadge";
import { useTabs } from "@/providers/TabsProvider";
import type { ProductionOrderProgressDto } from "@/types/api";
import type { InventoryDocStatus } from "@/types/inventory";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });

/** جمع «قطعی» و «در جریان» به‌صورت یک خانه */
function Qty({ done, pending }: { done: number; pending: number }) {
  return (
    <span className="tabular-nums">
      {fmt(done)}
      {pending > 0 && <span className="ms-1 text-xs text-muted-foreground">(+{fmt(pending)} در جریان)</span>}
    </span>
  );
}

/** پیشرفت محصول و ضایعات نسبت به مقدار سفارش */
export function OutputSummary({ progress, unitName }: { progress: ProductionOrderProgressDto; unitName: string }) {
  const tiles: [string, React.ReactNode][] = [
    ["مقدار سفارش", <span key="q" className="tabular-nums">{fmt(progress.orderQuantity)}</span>],
    ["محصول دریافت‌شده", <Qty key="r" done={progress.receivedQuantity} pending={progress.pendingReceiptQuantity} />],
    ["ضایعات", <Qty key="s" done={progress.scrapQuantity} pending={progress.pendingScrapQuantity} />],
  ];
  return (
    <dl className="grid gap-4 p-4 text-sm sm:grid-cols-3">
      {tiles.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-1 text-muted-foreground">{label}</dt>
          <dd className="font-medium">
            {value} <span className="text-xs text-muted-foreground">{unitName}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** نیاز، مصرف قطعی، در جریان و باقیمانده هر ماده؛ ماده خارج از فرمول جدا علامت می‌خورد */
export function MaterialProgressTable({ progress }: { progress: ProductionOrderProgressDto }) {
  if (progress.materials.length === 0)
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        فرمول این کالا ماده اولیه‌ای ندارد.
      </p>
    );

  return (
    <div className="rounded-md border">
      <Table aria-label="نیاز و مصرف مواد">
        <TableHeader>
          <TableRow>
            <TableHead>کد</TableHead>
            <TableHead>ماده اولیه</TableHead>
            <TableHead>نیاز</TableHead>
            <TableHead>صادرشده</TableHead>
            <TableHead>باقیمانده</TableHead>
            <TableHead>واحد</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {progress.materials.map((m) => (
            <TableRow key={m.materialId ?? `extra-${m.productId}`}>
              <TableCell dir="ltr" className="text-right font-mono text-xs">{m.productCode}</TableCell>
              <TableCell>
                {m.productName}
                {m.materialId == null && <span className="ms-2 text-xs text-warning">خارج از فرمول</span>}
              </TableCell>
              <TableCell className="tabular-nums">{fmt(m.requiredQuantity)}</TableCell>
              <TableCell>
                <Qty done={m.issuedQuantity} pending={m.pendingIssueQuantity} />
              </TableCell>
              <TableCell className="font-semibold tabular-nums">{fmt(m.remainingQuantity)}</TableCell>
              <TableCell className="text-muted-foreground">{m.unitName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** اسناد انبار ساخته‌شده از این سفارش؛ هر سطر سند را در تب جدید باز می‌کند */
export function LinkedDocsTable({ progress }: { progress: ProductionOrderProgressDto }) {
  const { addTab } = useTabs();
  if (progress.documents.length === 0)
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        هنوز سند انباری برای این سفارش صادر نشده است.
      </p>
    );

  return (
    <div className="rounded-md border">
      <Table aria-label="اسناد انبار سفارش">
        <TableHeader>
          <TableRow>
            <TableHead>شماره سند</TableHead>
            <TableHead>نوع سند</TableHead>
            <TableHead>تاریخ</TableHead>
            <TableHead>انبار</TableHead>
            <TableHead>وضعیت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {progress.documents.map((d) => (
            <TableRow key={d.docId}>
              <TableCell>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                  onClick={() => addTab(`سند ${d.docNumber}`, `/inventory/docs/edit/${d.docId}?mode=view`)}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <span className="tabular-nums">{d.docNumber.toLocaleString("fa-IR", { useGrouping: false })}</span>
                </button>
              </TableCell>
              <TableCell>
                {d.docTypeTitle}
                <span className="ms-1 text-xs text-muted-foreground">({d.natureTitle})</span>
              </TableCell>
              <TableCell>{new Date(d.docDate).toLocaleDateString("fa-IR")}</TableCell>
              <TableCell>{d.warehouseName}</TableCell>
              <TableCell>
                <InventoryDocStatusBadge status={d.statusId as InventoryDocStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
