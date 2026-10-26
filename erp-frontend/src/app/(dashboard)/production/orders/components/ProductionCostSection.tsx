"use client";

import { Info } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderCostDto } from "@/types/api";

// هم‌راستا با ProductionCostBasis در بک‌اند
const MATERIALS_AND_WORK_CENTERS = 2;

const rial = (n: number) => Math.round(n).toLocaleString("fa-IR");
const qty = (n: number) =>
  n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });

/** بهای ریالی سفارش: مواد، کارکرد مراکز کاری، ارزش رسیدها و بهای جذب‌نشده */
export default function ProductionCostSection({
  cost,
  unitName,
}: {
  cost: ProductionOrderCostDto;
  unitName: string;
}) {
  const withWorkCenters = cost.costBasis === MATERIALS_AND_WORK_CENTERS;
  const tiles: [string, string, string?][] = [
    ["بهای مواد", rial(cost.materialCost)],
    [
      "بهای کارکرد مراکز کاری",
      rial(cost.conversionCost),
      withWorkCenters ? undefined : "در مبنای فعلی به محصول نمی‌رسد",
    ],
    [
      "بهای سفارش",
      rial(cost.orderCost),
      withWorkCenters ? "مواد + کارکرد" : "فقط مواد",
    ],
    ["ارزش رسیدهای محصول و ضایعات", rial(cost.receivedValue)],
    [
      `بهای واحد (هر ${unitName})`,
      cost.unitCost == null ? "-" : rial(cost.unitCost),
      "شامل ضایعات",
    ],
  ];

  return (
    <div className="space-y-4 p-4">
      <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value, hint]) => (
          <div key={label}>
            <dt className="mb-1 text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">
              {value}{" "}
              <span className="text-xs text-muted-foreground">ریال</span>
            </dd>
            {hint && (
              <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
            )}
          </div>
        ))}
      </dl>

      {cost.unabsorbedCost > 0.5 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {rial(cost.unabsorbedCost)} ریال از بهای سفارش هنوز به هیچ رسیدی
            نرسیده است (حواله یا کارکردی که بعد از آخرین رسید قطعی شده). رسید
            بعدی محصول این مبلغ را می‌برد؛ اگر رسیدی در کار نیست، پیش از تکمیل
            سفارش آن را بررسی کنید.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ماده</TableHead>
                <TableHead>مقدار خالص مصرف</TableHead>
                <TableHead>بها (ریال)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cost.materials.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    هنوز حواله مواد قطعی نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                cost.materials.map((m) => (
                  <TableRow key={m.productId}>
                    <TableCell>
                      {m.productCode} - {m.productName}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {qty(m.quantity)}{" "}
                      <span className="text-xs text-muted-foreground">
                        {m.unitName}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {rial(m.cost)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {cost.materials.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>جمع مواد</TableCell>
                  <TableCell className="tabular-nums">
                    {rial(cost.materialCost)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عملیات</TableHead>
                <TableHead>مرکز کاری</TableHead>
                <TableHead>کارکرد (دقیقه)</TableHead>
                <TableHead>بها (ریال)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cost.operations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    فرمول این سفارش مسیر تولید ندارد.
                  </TableCell>
                </TableRow>
              ) : (
                cost.operations.map((o) => (
                  <TableRow key={o.operationId}>
                    <TableCell>
                      {o.sequence.toLocaleString("fa-IR")}. {o.title}
                    </TableCell>
                    <TableCell>{o.workCenterTitle}</TableCell>
                    <TableCell className="tabular-nums">
                      {qty(o.minutes)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {rial(o.cost)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {cost.operations.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>جمع کارکرد</TableCell>
                  <TableCell className="tabular-nums">
                    {rial(cost.conversionCost)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
