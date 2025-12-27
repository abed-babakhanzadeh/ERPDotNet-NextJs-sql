"use client";

import React, { useCallback } from "react";
import { toast } from "sonner";
import { Box, Plus } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { Button } from "@/components/ui/button";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useTabs } from "@/providers/TabsProvider";

import { ProductListTable } from "@/modules/base-info/products/components/ProductListTable";
import { productService } from "@/modules/base-info/products/services/productService";
import { Product } from "@/modules/base-info/products/types";

export default function ProductsPage() {
  const { addTab } = useTabs();

  const { tableProps, refresh } = useServerDataTable<Product>({
    endpoint: "/BaseInfo/Products/search",
    initialPageSize: 10,
  });

  const handleCreate = () => {
    addTab("تعریف کالا/قلم", "/base-info/products/create");
  };

  // --- اصلاح هندلر مشاهده ---
  const handleView = useCallback(
    (product: Product) => {
      // باز کردن مسیر view به جای edit
      addTab(
        `مشاهده ${product.name}`,
        `/base-info/products/view/${product.id}`
      );
    },
    [addTab]
  );

  const handleEdit = useCallback(
    (product: Product) => {
      addTab(
        `ویرایش ${product.name}`,
        `/base-info/products/edit/${product.id}`
      );
    },
    [addTab]
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      if (!confirm(`آیا از حذف محصول ${product.name} اطمینان دارید؟`)) return;

      try {
        await productService.delete(product.id);
        toast.success("محصول با موفقیت حذف شد");
        refresh();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || "خطا در حذف محصول");
      }
    },
    [refresh]
  );

  const headerActions = (
    <Button onClick={handleCreate} size="sm" className="gap-2">
      <Plus size={16} />
      <span>کالا/قلم جدید</span>
    </Button>
  );

  return (
    <BaseListLayout
      title="مدیریت کالاها/اقلام"
      icon={Box}
      actions={headerActions}
      count={tableProps.rowCount}
    >
      <ProductListTable
        tableProps={tableProps}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </BaseListLayout>
  );
}
