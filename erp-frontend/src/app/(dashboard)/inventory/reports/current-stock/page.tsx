"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PackageSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Label as UILabel } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import inventoryService from "@/services/inventoryService";
import { InventoryStockDto } from "@/types/inventory";
import { ColumnConfig } from "@/types";
import { useServerDataTable } from "@/hooks/useServerDataTable";

// 🌟 هوک اختصاصی برای حفظ وضعیت فیلترها هنگام جابجایی در تب‌ها
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

export default function CurrentStockReportPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // استفاده از هوک برای حفظ دیتا در Session Storage
  const [selectedWarehouseId, setSelectedWarehouseId] = usePersistentState<
    number | null
  >("cs_wh_id", null);
  const [excludeZeros, setExcludeZeros] = usePersistentState<boolean>(
    "cs_ex_zeros",
    true,
  );

  // دریافت لیست انبارها
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await inventoryService.getWarehouses({
          pageNumber: 1,
          pageSize: 500,
        });
        setWarehouses(res.items || res.data || []);
      } catch (error) {
        toast.error("خطا در دریافت لیست انبارها");
      }
    };
    fetchWarehouses();
  }, []);

  const { tableProps, refresh, totalCount } =
    useServerDataTable<InventoryStockDto>({
      endpoint: "/Inventory/Inventory/stock/current",
      initialPageSize: 15,
      extraPayload: {
        warehouseId: selectedWarehouseId,
        excludeZeroBalances: excludeZeros,
      },
    });

  // در صورت تغییر فیلترهای بالا، اطلاعات خودکار رفرش می‌شود
  useEffect(() => {
    refresh();
  }, [selectedWarehouseId, excludeZeros]);

  const columns: ColumnConfig[] = useMemo(
    () => [
      {
        key: "id",
        title: "شناسه",
        label: "شناسه",
        hidden: true,
        type: "number",
      },
      {
        key: "warehouseTitle",
        title: "انبار",
        label: "انبار",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "productCode",
        title: "کد کالا",
        label: "کد کالا",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "productName",
        title: "نام کالا",
        label: "نام کالا",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "unitTitle",
        title: "واحد",
        label: "واحد",
        sortable: true,
        filterable: false,
        type: "string",
      },
      {
        key: "batchNumber",
        title: "بچ/لات",
        label: "بچ/لات",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "locationCode",
        title: "جانمایی",
        label: "جانمایی",
        sortable: true,
        filterable: true,
        type: "string",
      },
      {
        key: "quantityOnHand",
        title: "موجودی فیزیکی",
        label: "موجودی فیزیکی",
        sortable: true,
        filterable: true,
        type: "number",
      },
      {
        key: "quantityReserved",
        title: "رزرو شده",
        label: "رزرو شده",
        sortable: true,
        filterable: true,
        type: "number",
      },
      {
        key: "availableQuantity",
        title: "موجودی در دسترس",
        label: "موجودی در دسترس",
        sortable: true,
        filterable: true,
        type: "number",
      },
    ],
    [],
  );

  // 🌟 ساختار فشرده و ریسپانسیو برای هدر (سازگار با موبایل و تب‌ها)
  const headerActions = (
    <div className="flex flex-row items-center justify-end gap-1.5 sm:gap-2 w-full">
      {/* دراپ‌داون انبار */}
      <Select
        value={selectedWarehouseId ? selectedWarehouseId.toString() : "all"}
        onValueChange={(val) => {
          setSelectedWarehouseId(val === "all" ? null : Number(val));
        }}
      >
        <SelectTrigger className="w-[120px] sm:w-[180px] h-8 bg-background text-xs shrink-0">
          <SelectValue placeholder="همه انبارها" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه انبارها</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id.toString()}>
              {w.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* چک‌باکس با استایل دکمه‌ای تمیز */}
      <div className="flex items-center gap-1.5 shrink-0 bg-background border px-2 py-1.5 rounded-md h-8">
        <Checkbox
          id="excludeZeros"
          checked={excludeZeros}
          onCheckedChange={(checked) => setExcludeZeros(checked as boolean)}
          className="w-3.5 h-3.5"
        />
        <UILabel
          htmlFor="excludeZeros"
          className="text-[11px] sm:text-xs cursor-pointer whitespace-nowrap pt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          بدون موجودی صفر
        </UILabel>
      </div>

      {/* دکمه رفرش آیکونی */}
      <Button
        onClick={refresh}
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 hover:bg-accent"
        title="بروزرسانی"
      >
        <RefreshCw size={14} className="text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <ProtectedPage permission="Inventory.Reports.CurrentStock">
      <BaseListLayout
        title="موجودی لحظه‌ای"
        description="گزارش و ره‌گیری لحظه‌ای موجودی کالاها در انبارها"
        icon={PackageSearch}
        count={totalCount}
        actions={headerActions}
      >
        <div className="bg-card border rounded-md h-[calc(100vh-180px)]">
          <DataTable columns={columns} {...tableProps} />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
