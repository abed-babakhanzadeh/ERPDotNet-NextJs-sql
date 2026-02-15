"use client";

import React, { useMemo } from "react";
import { Product, ColumnConfig } from "@/types";
import apiClient from "@/services/apiClient";
import { Box, Plus, ImageIcon } from "lucide-react";
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useTabs } from "@/providers/TabsProvider";
import { useTabPrefetch } from "@/hooks/useTabPrefetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BaseListLayout from "@/components/layout/BaseListLayout";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ProductsPage() {
  const { addTab } = useTabs();

  useTabPrefetch(["/base-info/products/create"]);

  const { tableProps, refresh, totalCount } = useServerDataTable<Product>({
    endpoint: "/BaseInfo/Products/search",
    initialPageSize: 30,
  });

  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "imagePath",
        label: "تصویر",
        type: "custom", // تغییر به custom
        render: (value: any, row: any) => {
          if (!row.imagePath)
            return (
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center border">
                <ImageIcon size={14} className="opacity-50" />
              </div>
            );
          return (
            <div className="w-8 h-8 rounded overflow-hidden border bg-white hover:scale-[2.5] transition-transform cursor-pointer shadow-sm relative z-0 hover:z-50 origin-left">
              <img
                src={`${BACKEND_URL}${row.imagePath}`}
                alt={row.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          );
        },
      },
      { key: "code", label: "کد کالا", type: "string", sortable: true },
      { key: "name", label: "نام کالا", type: "string", sortable: true },
      { key: "latinName", label: "نام لاتین", type: "string", sortable: true },
      { key: "unitName", label: "واحد", type: "string" },
      { key: "supplyType", label: "نوع تامین", type: "string" },
      {
        key: "descriptions",
        label: "توضیحات",
        type: "custom",
        render: (value: any) => (
          <span
            className="truncate max-w-[150px] block text-muted-foreground text-xs"
            title={value}
          >
            {value || "-"}
          </span>
        ),
      },
      {
        key: "conversions",
        label: "واحد فرعی",
        type: "custom",
        render: (_: any, row: any) => {
          const count = row.conversions?.length || 0;
          return count > 0 ? (
            <Badge variant="secondary" className="text-[10px] px-2 h-5">
              {count} واحد
            </Badge>
          ) : (
            <span className="text-muted-foreground text-[10px]">-</span>
          );
        },
      },
      {
        key: "isActive",
        label: "وضعیت",
        type: "boolean",
        render: (val: boolean) =>
          val ? (
            <Badge className="bg-emerald-500 hover:bg-emerald-600 h-5 text-[10px]">
              فعال
            </Badge>
          ) : (
            <Badge variant="destructive" className="h-5 text-[10px]">
              غیرفعال
            </Badge>
          ),
      },
    ],
    [],
  );

  const handleCreate = () => {
    addTab("تعریف کالا جدید", "/base-info/products/create");
  };

  const handleView = (row: Product) => {
    addTab(`جزئیات ${row.name}`, `/base-info/products/view/${row.id}`);
  };

  const handleEdit = (row: Product) => {
    // اصلاح شد: مسیر جدید بدون کوئری پارامتر قدیمی
    addTab(`ویرایش ${row.name}`, `/base-info/products/edit/${row.id}`);
  };

  const handleDelete = async (row: Product) => {
    if (!confirm(`آیا از حذف کالا "${row.name}" اطمینان دارید؟`)) return;

    try {
      await apiClient.delete(`/BaseInfo/Products/${row.id}`);
      toast.success("کالا با موفقیت حذف شد");
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در حذف کالا.");
    }
  };

  const headerActions = (
    <PermissionGuard permission="BaseInfo.Products.Create">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreate}
              size="sm"
              className="h-8 gap-1.5 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">کالای جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] sm:hidden">
            تعریف کالای جدید
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission="BaseInfo.Products.View">
      <BaseListLayout
        title="مدیریت کالاها و اقلام"
        description="لیست کالاها، خدمات و محصولات با امکان تعریف واحدهای فرعی و تنظیمات انبار"
        icon={Box}
        actions={headerActions}
        count={totalCount}
      >
        <div className="bg-card border rounded-md h-[calc(100vh-180px)]">
          <DataTable
            columns={columns}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            {...tableProps}
          />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
