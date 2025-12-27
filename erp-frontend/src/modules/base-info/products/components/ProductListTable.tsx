"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { Product, ProductSupplyType } from "../types";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

interface ProductListTableProps {
  tableProps: any;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductListTable({
  tableProps,
  onView,
  onEdit,
  onDelete,
}: ProductListTableProps) {
  const columns: any[] = useMemo(
    () => [
      {
        key: "imagePath",
        label: "تصویر",
        type: "string",
        filterable: false, // <--- این خط اضافه شد (حذف جستجو)
        sortable: false, // تصویر نباید سورت شود
        render: (_: any, row: Product) => (
          <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-md border overflow-hidden">
            {row.imagePath ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${row.imagePath}`}
                alt={row.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-400" />
            )}
          </div>
        ),
      },
      {
        key: "code",
        label: "کد کالا",
        type: "string",
        sortable: true,
        filterable: true,
      },
      {
        key: "name",
        label: "نام کالا",
        type: "string",
        sortable: true,
        filterable: true,
      },
      {
        key: "latinName",
        label: "نام لاتین",
        type: "string",
        sortable: true,
      },
      {
        key: "unitName",
        label: "واحد سنجش",
        type: "string",
      },
      {
        key: "supplyType",
        label: "نوع تامین",
        type: "string",
        render: (_: any, row: Product) => {
          const typeMap: Record<number, string> = {
            [ProductSupplyType.Buy]: "خریدنی",
            [ProductSupplyType.Produce]: "تولیدی",
            [ProductSupplyType.Service]: "خدمات",
          };
          return <Badge variant="secondary">{typeMap[row.supplyType]}</Badge>;
        },
      },
      {
        key: "isActive",
        label: "وضعیت",
        type: "boolean",
        render: (_: any, row: Product) => (
          <Badge variant={row.isActive ? "default" : "destructive"}>
            {row.isActive ? "فعال" : "غیرفعال"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      {...tableProps}
    />
  );
}
