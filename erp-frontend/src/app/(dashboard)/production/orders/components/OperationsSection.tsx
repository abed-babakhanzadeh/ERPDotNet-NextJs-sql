"use client";

import { ClipboardPen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionOperationDto } from "@/types/api";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
const minutes = (n: number) => (n >= 60 ? `${fmt(n / 60)} ساعت` : `${fmt(n)} دقیقه`);

/** کارایی: سبز در محدوده، زرد کمتر از ۸۵٪ */
function Efficiency({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  return <StatusBadge tone={value >= 85 ? "success" : "warning"} icon={false} label={`${fmt(value)}٪`} />;
}

interface Props {
  operations: ProductionOperationDto[];
  unitName: string;
  /** سفارش تأییدشده یا در حال تولید؛ فقط در این حالت کارکرد ثبت و حذف می‌شود */
  canReport: boolean;
  onReport: (operation: ProductionOperationDto) => void;
  onDeleteReport: (reportId: number, label: string) => void;
}

/** عملیات سفارش (از مسیر تولید فرمول) با زمان برنامه، واقعی، کارایی و گزارش‌های کارکرد */
export default function OperationsSection({ operations, unitName, canReport, onReport, onDeleteReport }: Props) {
  if (operations.length === 0)
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        فرمول این سفارش مسیر تولید ندارد. مسیر را در فرم فرمول (تب «مسیر تولید») تعریف کنید.
      </p>
    );

  const reports = operations.flatMap((o) => o.reports.map((r) => ({ ...r, operation: o })));

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table aria-label="عملیات سفارش">
          <TableHeader>
            <TableRow>
              <TableHead>ترتیب</TableHead>
              <TableHead>عملیات</TableHead>
              <TableHead>مرکز کاری</TableHead>
              <TableHead>زمان برنامه</TableHead>
              <TableHead>زمان واقعی</TableHead>
              <TableHead>انجام‌شده</TableHead>
              <TableHead>کارایی</TableHead>
              <TableHead>باقی‌مانده</TableHead>
              {canReport && <TableHead className="w-28" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="tabular-nums">{o.sequence.toLocaleString("fa-IR")}</TableCell>
                <TableCell>{o.title}</TableCell>
                <TableCell>
                  <span dir="ltr" className="me-1.5 font-mono text-xs text-muted-foreground">
                    {o.workCenterCode}
                  </span>
                  {o.workCenterTitle}
                </TableCell>
                <TableCell className="tabular-nums">{minutes(o.plannedSetupMinutes + o.plannedRunMinutes)}</TableCell>
                <TableCell className="tabular-nums">{minutes(o.actualSetupMinutes + o.actualRunMinutes)}</TableCell>
                <TableCell className="tabular-nums">
                  {fmt(o.goodQuantity)} <span className="text-xs text-muted-foreground">{unitName}</span>
                  {o.scrapQuantity > 0 && <span className="ms-1 text-xs text-destructive">(+{fmt(o.scrapQuantity)} ضایعات)</span>}
                  <span className="ms-1 text-xs text-muted-foreground">({fmt(o.progressPercent)}٪)</span>
                </TableCell>
                <TableCell>
                  <Efficiency value={o.efficiencyPercent} />
                </TableCell>
                <TableCell className="tabular-nums">{minutes(o.remainingMinutes)}</TableCell>
                {canReport && (
                  <TableCell>
                    <PermissionGuard permission="Production.Orders.Execute">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onReport(o)}>
                        <ClipboardPen className="h-3.5 w-3.5" aria-hidden />
                        ثبت کارکرد
                        <span className="sr-only"> عملیات {o.title}</span>
                      </Button>
                    </PermissionGuard>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {reports.length > 0 && (
        <div className="rounded-md border">
          <Table aria-label="گزارش‌های کارکرد">
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>سالم</TableHead>
                <TableHead>ضایعات</TableHead>
                <TableHead>آماده‌سازی</TableHead>
                <TableHead>اجرا</TableHead>
                <TableHead>ثبت‌کننده</TableHead>
                <TableHead>توضیحات</TableHead>
                {canReport && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.reportDate).toLocaleDateString("fa-IR")}</TableCell>
                  <TableCell>
                    {r.operation.sequence.toLocaleString("fa-IR")} - {r.operation.title}
                  </TableCell>
                  <TableCell className="tabular-nums">{fmt(r.goodQuantity)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(r.scrapQuantity)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(r.setupMinutes)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(r.runMinutes)}</TableCell>
                  <TableCell>{r.reportedBy}</TableCell>
                  <TableCell className="text-muted-foreground">{r.note ?? "-"}</TableCell>
                  {canReport && (
                    <TableCell>
                      <PermissionGuard permission="Production.Orders.Execute">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          aria-label={`حذف کارکرد ${r.operation.title} ${new Date(r.reportDate).toLocaleDateString("fa-IR")}`}
                          onClick={() => onDeleteReport(r.id, `${r.operation.title} ${new Date(r.reportDate).toLocaleDateString("fa-IR")}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
