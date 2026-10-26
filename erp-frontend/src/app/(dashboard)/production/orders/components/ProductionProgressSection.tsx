"use client";

import { FileText } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryDocStatusBadge } from "@/components/inventory/InventoryDocStatusBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useTabs } from "@/providers/TabsProvider";
import type { ProductionOrderProgressDto } from "@/types/api";
import type { InventoryDocStatus } from "@/types/inventory";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

/**
 * درصد انحراف یک ماده: قرمز اگر از مصرف مجاز (با ضایعات فرمول) بیشتر شده، سبز اگر در محدوده است.
 * برای ماده خارج از فرمول درصد معنا ندارد و فقط «خارج از فرمول» نشان داده می‌شود.
 */
export function VarianceBadge({ percent, overAllowed }: { percent?: number | null; overAllowed: boolean }) {
  const label = percent == null ? "خارج از فرمول" : `${percent > 0 ? "+" : ""}${percent.toLocaleString("fa-IR")}٪`;
  return <StatusBadge tone={overAllowed ? "danger" : "success"} icon={false} label={label} />;
}

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
  const yieldText = progress.yieldPercent == null ? "-" : `${progress.yieldPercent.toLocaleString("fa-IR")}٪`;
  return (
    <dl className="grid gap-4 p-4 text-sm sm:grid-cols-4">
      {tiles.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-1 text-muted-foreground">{label}</dt>
          <dd className="font-medium">
            {value} <span className="text-xs text-muted-foreground">{unitName}</span>
          </dd>
        </div>
      ))}
      <div>
        <dt className="mb-1 text-muted-foreground">بازده (سالم از کل تولید)</dt>
        <dd className="font-medium tabular-nums">{yieldText}</dd>
      </div>
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

/**
 * انحراف مقداری: مصرف قطعی در برابر استاندارد فرمول برای مقدار تولیدشده (سالم + ضایعات).
 * فقط اسناد قطعی حساب می‌شوند؛ اسناد در جریان پس از قطعی شدن اثر می‌گذارند.
 */
export function MaterialVarianceTable({ progress }: { progress: ProductionOrderProgressDto }) {
  if (progress.producedQuantity <= 0)
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        انحراف پس از اولین رسید قطعی محصول محاسبه می‌شود.
      </p>
    );

  return (
    <div className="rounded-md border">
      <Table aria-label="انحراف مصرف مواد">
        <TableHeader>
          <TableRow>
            <TableHead>ماده اولیه</TableHead>
            <TableHead>استاندارد</TableHead>
            <TableHead>مجاز (با ضایعات فرمول)</TableHead>
            <TableHead>مصرف واقعی</TableHead>
            <TableHead>انحراف</TableHead>
            <TableHead>درصد</TableHead>
            <TableHead>واحد</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {progress.materials.map((m) => (
            <TableRow key={m.materialId ?? `extra-${m.productId}`}>
              <TableCell>
                <span dir="ltr" className="me-2 font-mono text-xs text-muted-foreground">
                  {m.productCode}
                </span>
                {m.productName}
              </TableCell>
              <TableCell className="tabular-nums">{fmt(m.standardForOutput)}</TableCell>
              <TableCell className="tabular-nums">{fmt(m.allowedForOutput)}</TableCell>
              <TableCell className="tabular-nums">{fmt(m.issuedQuantity)}</TableCell>
              <TableCell dir="ltr" className="text-right font-semibold tabular-nums">
                {signed(m.varianceQuantity)}
              </TableCell>
              <TableCell>
                <VarianceBadge percent={m.variancePercent} overAllowed={m.overAllowed} />
              </TableCell>
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
