"use client";

import { Building2 } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { Badge } from "@/components/ui/badge";
import { companyService } from "@/services/baseInfoService";
import type { CompanyDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string" },
  { key: "title", label: "نام شرکت", type: "string", mobile: "title" },
  { key: "nationalId", label: "شناسه ملی", type: "string" },
  { key: "economicCode", label: "کد اقتصادی", type: "string" },
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

export default function CompaniesPage() {
  return (
    <BaseInfoListPage<CompanyDto>
      title="شرکت‌ها"
      icon={Building2}
      permission="BaseInfo.Companies"
      basePath="/base-info/companies"
      entityName="شرکت"
      columns={columns}
      rowLabel={(row) => row.title}
      service={companyService}
    />
  );
}
