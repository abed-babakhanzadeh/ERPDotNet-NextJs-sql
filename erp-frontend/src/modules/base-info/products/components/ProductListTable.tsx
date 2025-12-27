"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { Product } from "../types";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        filterable: false,
        sortable: false,
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
      // افزودن ستون توضیحات با تولتیپ برای متون طولانی
      {
        key: "descriptions", // دقت کنید: در DTO شما Descriptions با s جمع است
        label: "توضیحات",
        type: "string",
        render: (val: string) => {
          if (!val) return "-";
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="max-w-[150px] truncate text-xs text-muted-foreground cursor-help">
                    {val}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-wrap">
                  {val}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        key: "unitName",
        label: "واحد سنجش",
        type: "string",
      },
      {
        key: "supplyType",
        label: "نوع تامین",
        type: "string", // چون در DTO مقدار supplyType به صورت رشته (مثلا "خریدنی") میاید
        render: (val: string, row: any) => {
          // اگر DTO شما فیلد supplyType را رشته برمی‌گرداند، مستقیم نمایش دهید
          // اگر عدد برمی‌گرداند، باید مپ کنید. طبق فایل GetAllProductsQuery شما supplyType رشته است.
          return <Badge variant="secondary">{val || row.supplyType}</Badge>;
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
