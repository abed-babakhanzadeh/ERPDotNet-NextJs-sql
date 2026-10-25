"use client";

import { Palette } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { Badge } from "@/components/ui/badge";
import { productAttributeService } from "@/services/baseInfoService";
import type { ProductAttributeDto, ProductAttributeValueDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string" },
  { key: "title", label: "عنوان", type: "string", mobile: "title" },
  {
    key: "values",
    label: "مقادیر",
    type: "custom",
    sortable: false,
    filterable: false,
    render: (values: ProductAttributeValueDto[]) => (
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v.id} variant="secondary" className="font-normal">
            {v.title}
          </Badge>
        ))}
      </div>
    ),
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

export default function ProductAttributesPage() {
  return (
    <BaseInfoListPage<ProductAttributeDto>
      title="ویژگی‌های کالا"
      icon={Palette}
      permission="BaseInfo.ProductAttributes"
      basePath="/base-info/product-attributes"
      entityName="ویژگی کالا"
      columns={columns}
      rowLabel={(row) => row.title}
      service={productAttributeService}
    />
  );
}
