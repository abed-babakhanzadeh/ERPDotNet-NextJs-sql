"use client";

import { Coins } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { Badge } from "@/components/ui/badge";
import { costCenterService } from "@/services/baseInfoService";
import type { CostCenterDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

// هم‌ترتیب با CostCenterType در بک‌اند
const TYPE_LABELS: Record<number, string> = {
  1: "تولیدی",
  2: "خدماتی",
  3: "اداری",
  4: "فروش و توزیع",
};

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string" },
  { key: "title", label: "عنوان", type: "string", mobile: "title" },
  { key: "type", label: "نوع", type: "number", render: (v) => TYPE_LABELS[v] ?? "—" },
  {
    key: "parentTitle",
    label: "مرکز والد",
    type: "string",
    render: (v) => v || <span className="text-muted-foreground text-xs">-</span>,
  },
  {
    key: "isActive",
    label: "وضعیت",
    type: "boolean",
    render: (val) =>
          val ? (
            <Badge className="bg-success hover:bg-success/90">فعال</Badge>
          ) : (
            <Badge variant="destructive">غیرفعال</Badge>
          ),
  },
];

export default function CostCentersPage() {
  return (
    <BaseInfoListPage<CostCenterDto>
      title="مراکز هزینه"
      icon={Coins}
      permission="BaseInfo.CostCenters"
      basePath="/base-info/cost-centers"
      entityName="مرکز هزینه"
      columns={columns}
      rowLabel={(row) => row.title}
      service={costCenterService}
    />
  );
}
