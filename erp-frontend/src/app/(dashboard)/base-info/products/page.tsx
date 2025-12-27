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
// 1. فراخوانی لایوت جدید
import BaseListLayout from "@/components/layout/BaseListLayout";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const PlaceholderWrapper: React.FC<{
  children: React.ReactNode;
  permission?: string;
  title?: string;
  icon?: any;
  actions?: React.ReactNode;
}> = ({ children }) => <div>{children}</div>;

const ProtectedPagePlaceholder = ProtectedPage || PlaceholderWrapper;
const PermissionGuardPlaceholder =
  PermissionGuard || (({ children }) => <>{children}</>);

export default function ProductsPage() {
  const { addTab } = useTabs();

  useTabPrefetch(["/base-info/products/create"]);

  const { tableProps, refresh, totalCount } = useServerDataTable<Product>({
    // اصلاح شد: اضافه کردن BaseInfo به ابتدای آدرس
    endpoint: "/BaseInfo/Products/search",
    initialPageSize: 30,
  });

  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "imagePath",
        label: "تصویر",
        type: "string",
        render: (value: any, row: Product) => {
          if (!value)
            return (
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <ImageIcon size={14} className="opacity-50" />
              </div>
            );
          return (
            <div className="w-8 h-8 rounded overflow-hidden border bg-white hover:scale-150 transition-transform cursor-pointer shadow-sm relative z-0 hover:z-50">
              <img
                src={`${BACKEND_URL}${value}`}
                alt={row.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          );
        },
      },
      { key: "code", label: "کد کالا/قلم", type: "string" },
      { key: "name", label: "نام کالا/قلم", type: "string" },
      { key: "latinName", label: "نام لاتين کالا/قلم", type: "string" },
      { key: "unitName", label: "واحد", type: "string" },
      { key: "supplyType", label: "نوع تامین", type: "string" },
      {
        // اصلاح مهم: حتماً با حرف کوچک بنویسید
        key: "descriptions",
        label: "توضيحات",
        type: "string",
        render: (value) => (
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
        label: "فرعی",
        type: "string",
        render: (_: any, row: Product) => {
          const count = row.conversions?.length || 0;
          return count > 0 ? (
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">
              {count} واحد
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px]">-</span>
          );
        },
      },

      {
        key: "isActive",
        label: "وضعیت",
        type: "boolean",
        render: (val) =>
          val ? (
            <Badge className="bg-emerald-500 hover:bg-emerald-600">فعال</Badge>
          ) : (
            <Badge variant="destructive">غیرفعال</Badge>
          ),
      },
    ],
    []
  );

  const handleCreate = () => {
    addTab("تعریف کالا/قلمی جدید", "/base-info/products/create");
  };

  const handleView = (row: Product) => {
    addTab(`جزئیات ${row.name}`, `/base-info/products/edit/${row.id}`);
  };

  const handleEdit = (row: Product) => {
    addTab(
      `ویرایش ${row.name}`,
      `/base-info/products/edit/${row.id}?mode=edit`
    );
  };

  const handleDelete = async (row: Product) => {
    if (!confirm(`آیا از حذف کالا/قلمی "${row.name}" اطمینان دارید؟`)) return;

    try {
      await apiClient.delete(`/BaseInfo/Products/${row.id}`);
      toast.success("کالا/قلم با موفقیت حذف شد");
      refresh();
    } catch (error: any) {
      toast.error("خطا در حذف کالا/قلم. ممکن است در اسناد استفاده شده باشد.");
    }
  };

  // 3. تعریف دکمه‌های اکشن (کالا/قلمی جدید) برای ارسال به لایوت
  const headerActions = (
    <PermissionGuardPlaceholder permission="BaseInfo.Products.Create">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCreate}
              size="sm"
              className="h-8 gap-1.5 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline text-xs">کالا/قلمی جدید</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] sm:hidden">
            کالا/قلمی جدید
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionGuardPlaceholder>
  );

  return (
    <ProtectedPagePlaceholder permission="BaseInfo.Products">
      {/* 4. استفاده از BaseListLayout به جای هدر دستی */}
      <BaseListLayout
        title="مدیریت کالا/قلمها"
        icon={Box}
        actions={headerActions}
        count={totalCount} // نمایش تعداد کل رکوردها
      >
        <DataTable
          columns={columns}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          {...tableProps}
        />
      </BaseListLayout>
    </ProtectedPagePlaceholder>
  );
}
