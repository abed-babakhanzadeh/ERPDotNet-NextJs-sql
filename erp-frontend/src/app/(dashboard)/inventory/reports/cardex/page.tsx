"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { History, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableLookupCombobox } from "@/components/ui/TableLookupCombobox";

import inventoryService from "@/services/inventoryService";
import apiClient from "@/services/apiClient";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { ColumnConfig } from "@/types";

// 🌟 هوک اختصاصی برای حفظ وضعیت فیلترها هنگام جابجایی در تب‌ها 🌟
function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.sessionStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        return initialValue;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState] as const;
}

export default function ProductCardexPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // استفاده از هوک جدید برای حفظ دیتا در Session Storage
  const [selectedWarehouseId, setSelectedWarehouseId] = usePersistentState<
    number | null
  >("cardex_wh_id", null);
  const [selectedProductId, setSelectedProductId] = usePersistentState<
    number | null
  >("cardex_pr_id", null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const whRes = await inventoryService.getWarehouses({
          pageNumber: 1,
          pageSize: 500,
        });
        setWarehouses(whRes.items || whRes.data || []);
      } catch (error) {
        toast.error("خطا در دریافت لیست انبارها");
      }
    };
    fetchWarehouses();
  }, []);

  const fetchProducts = useCallback(async (searchTerm: string = "") => {
    try {
      const res = await apiClient.post("/BaseInfo/Products/search", {
        pageNumber: 1,
        pageSize: 50,
        searchTerm,
      });
      setProductOptions(res.data?.items || res.data || []);
    } catch (error) {
      toast.error("خطا در دریافت لیست کالاها");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const { tableProps, refresh, totalCount } = useServerDataTable<any>({
    endpoint: "/Inventory/Inventory/reports/cardex",
    initialPageSize: 15,
    extraPayload: {
      warehouseId: selectedWarehouseId,
      productId: selectedProductId,
    },
  });

  useEffect(() => {
    if (selectedProductId) {
      refresh();
    }
  }, [selectedWarehouseId, selectedProductId]);

  const formattedData = useMemo(() => {
    return tableProps.data.map((item) => ({
      ...item,
      transactionDate: item.transactionDate
        ? new Date(item.transactionDate).toLocaleDateString("fa-IR")
        : "",
    }));
  }, [tableProps.data]);

  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "transactionId",
        title: "شناسه",
        label: "شناسه",
        hidden: true,
        type: "number",
      },
      {
        key: "transactionDate",
        title: "تاریخ تراکنش",
        label: "تاریخ",
        sortable: true,
        filterable: true,
        type: "date",
      },
      // ✨ ستون انبار به کاردکس اضافه شد
      {
        key: "warehouseTitle",
        title: "انبار",
        label: "انبار",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "docNumber",
        title: "شماره سند",
        label: "شماره سند",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "docTypeTitle",
        title: "نوع سند",
        label: "نوع سند",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "description",
        title: "شرح",
        label: "شرح",
        sortable: false,
        filterable: true,
        type: "string",
      },
      {
        key: "signTitle",
        title: "جهت",
        label: "جهت",
        sortable: false,
        filterable: true,
        type: "string",
      },
      {
        key: "inQuantity",
        title: "وارده",
        label: "وارده",
        sortable: false,
        filterable: true,
        type: "number",
      },
      {
        key: "outQuantity",
        title: "صادره",
        label: "صادره",
        sortable: false,
        filterable: true,
        type: "number",
      },
      {
        key: "runningBalance",
        title: "موجودی",
        label: "موجودی",
        sortable: false,
        filterable: false,
        type: "number",
      },
    ],
    [],
  );

  const headerActions = (
    <div className="flex flex-row items-center justify-end gap-1.5 sm:gap-2 w-full">
      <Select
        value={selectedWarehouseId ? selectedWarehouseId.toString() : "all"}
        onValueChange={(val) =>
          setSelectedWarehouseId(val === "all" ? null : Number(val))
        }
      >
        <SelectTrigger className="w-[110px] sm:w-[160px] h-8 bg-background text-xs shrink-0">
          <SelectValue placeholder="انتخاب انبار..." />
        </SelectTrigger>
        <SelectContent>
          {/* ✨ قابلیت انتخاب همه انبارها */}
          <SelectItem value="all">همه انبارها</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id.toString()}>
              {w.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-[140px] sm:w-[260px] shrink-0">
        <TableLookupCombobox
          value={selectedProductId}
          onValueChange={(val) => setSelectedProductId(val as number)}
          items={productOptions}
          columns={[
            { key: "code", label: "کد", width: "1fr" },
            { key: "name", label: "نام", width: "2fr" },
          ]}
          searchableFields={["code", "name"]}
          onSearch={fetchProducts}
          placeholder="جستجوی کالا..."
        />
      </div>

      <Button
        onClick={refresh}
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 hover:bg-accent"
        disabled={!selectedProductId} // فقط انتخاب کالا اجباری است
        title="بروزرسانی گزارش"
      >
        <RefreshCw size={14} className="text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <ProtectedPage permission="Inventory.Reports.Cardex">
      <BaseListLayout
        title="کاردکس کالا"
        description="گزارش خط‌به‌خط گردش و موجودی کالا در انبار"
        icon={History}
        count={totalCount}
        actions={headerActions}
      >
        <div className="bg-card border rounded-md h-[calc(100vh-180px)]">
          {!selectedProductId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 p-4 text-center">
              <History className="w-12 h-12 mb-3" />
              <p className="text-sm">
                لطفاً برای مشاهده کاردکس، یک کالا را از کادر جستجو انتخاب کنید.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} {...tableProps} data={formattedData} />
          )}
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
