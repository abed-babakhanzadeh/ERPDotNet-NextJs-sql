import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderMaterialDto } from "@/types/api";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });

/** جدول نیاز مواد سفارش تولید (مصرف استاندارد، ضایعات و نیاز نهایی) */
export default function MaterialRequirementsTable({ materials }: { materials: ProductionOrderMaterialDto[] }) {
  if (materials.length === 0)
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        فرمول این کالا ماده اولیه‌ای ندارد.
      </p>
    );

  return (
    <div className="rounded-md border">
      <Table aria-label="نیاز مواد">
        <TableHeader>
          <TableRow>
            <TableHead>کد</TableHead>
            <TableHead>ماده اولیه</TableHead>
            <TableHead>مصرف استاندارد</TableHead>
            <TableHead>ضایعات</TableHead>
            <TableHead>نیاز</TableHead>
            <TableHead>واحد</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((m, i) => (
            <TableRow key={m.id || i}>
              <TableCell dir="ltr" className="text-right font-mono text-xs">{m.productCode}</TableCell>
              <TableCell>{m.productName}</TableCell>
              <TableCell>{fmt(m.standardQuantity)}</TableCell>
              <TableCell>{m.wastePercentage ? `${fmt(m.wastePercentage)}٪` : "-"}</TableCell>
              <TableCell className="font-semibold">{fmt(m.requiredQuantity)}</TableCell>
              <TableCell className="text-muted-foreground">{m.unitName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
