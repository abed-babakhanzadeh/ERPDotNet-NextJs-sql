"use client";

import { FolderTree } from "lucide-react";
import BaseInfoListPage from "@/components/base-info/BaseInfoListPage";
import { Badge } from "@/components/ui/badge";
import { productCategoryService } from "@/services/baseInfoService";
import type { ProductCategoryDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

const columns: ColumnConfig[] = [
  { key: "code", label: "کد", type: "string" },
  { key: "title", label: "عنوان", type: "string", mobile: "title" },
  {
    key: "parentTitle",
    label: "گروه والد",
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

export default function ProductCategoriesPage() {
  return (
    <BaseInfoListPage<ProductCategoryDto>
      title="گروه‌های کالا"
      icon={FolderTree}
      permission="BaseInfo.ProductCategories"
      basePath="/base-info/product-categories"
      entityName="گروه کالا"
      columns={columns}
      rowLabel={(row) => row.title}
      service={productCategoryService}
    />
  );
}
