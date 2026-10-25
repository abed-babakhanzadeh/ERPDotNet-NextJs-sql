"use client";

import { CalendarRange } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { Badge } from "@/components/ui/badge";
import { fiscalYearService } from "@/services/baseInfoService";
import { formatDate } from "@/lib/format";
import type { FiscalYearDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const columns: ColumnConfig[] = [
  { key: "title", label: "عنوان", type: "string", mobile: "title" },
  { key: "companyTitle", label: "شرکت", type: "string" },
  { key: "startDate", label: "شروع", type: "date", render: (v) => formatDate(v) },
  { key: "endDate", label: "پایان", type: "date", render: (v) => formatDate(v) },
  {
    key: "status",
    label: "وضعیت",
    type: "number",
    render: (v) =>
      v === 1 ? (
        <Badge className="bg-success hover:bg-success/90">باز</Badge>
      ) : (
        <Badge variant="secondary">بسته</Badge>
      ),
  },
];

export default function FiscalYearsPage() {
  return (
    <BaseInfoListPage<FiscalYearDto>
      title="سال‌های مالی"
      icon={CalendarRange}
      permission="BaseInfo.FiscalYears"
      basePath="/base-info/fiscal-years"
      entityName="سال مالی"
      columns={columns}
      rowLabel={(row) => row.title}
      service={fiscalYearService}
    />
  );
}
