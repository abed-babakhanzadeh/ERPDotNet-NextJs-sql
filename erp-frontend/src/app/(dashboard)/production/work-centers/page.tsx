"use client";

import { Cog } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { workCenterService } from "@/services/productionService";
import type { WorkCenterDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string", width: 110 },
  { key: "title", label: "عنوان", type: "string", mobile: "title" },
  { key: "costCenterTitle", label: "مرکز هزینه", type: "string", render: (v: string | null) => v ?? "-" },
  {
    key: "hoursPerDay",
    label: "ساعت کاری روزانه",
    type: "number",
    render: (v: number) => <span className="tabular-nums">{v.toLocaleString("fa-IR")}</span>,
  },
  {
    key: "hourlyRate",
    label: "نرخ ساعتی (ریال)",
    type: "number",
    render: (v: number) => <span className="tabular-nums">{v.toLocaleString("fa-IR")}</span>,
  },
  {
    key: "isActive",
    label: "وضعیت",
    type: "boolean",
    render: (v: boolean) => <StatusBadge tone={v ? "success" : "neutral"} label={v ? "فعال" : "غیرفعال"} />,
  },
  { key: "description", label: "توضیحات", type: "string", render: (v: string | null) => v ?? "-" },
];

export default function WorkCentersPage() {
  return (
    <BaseInfoListPage<WorkCenterDto>
      title="مراکز کاری"
      icon={Cog}
      permission="Production.WorkCenters"
      basePath="/production/work-centers"
      entityName="مرکز کاری"
      columns={columns}
      rowLabel={(row) => row.title}
      service={workCenterService}
    />
  );
}
