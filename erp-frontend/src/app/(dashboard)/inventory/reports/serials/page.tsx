"use client";

import { useEffect, useMemo, useState } from "react";
import { Barcode, RefreshCw } from "lucide-react";

import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import inventoryService from "@/services/inventoryService";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { handleApiError } from "@/lib/error-handling";
import type { InventorySerialDto } from "@/types/api";
import type { ColumnConfig } from "@/types";

// هم‌ترتیب با InventorySerialStatus در بک‌اند
const IN_STOCK = 1;

const columns: ColumnConfig[] = [
  {
    key: "serialNumber",
    title: "شماره سریال",
    label: "شماره سریال",
    type: "string",
    mobile: "title",
  },
  { key: "productCode", title: "کد کالا", label: "کد کالا", type: "string" },
  { key: "productName", title: "نام کالا", label: "نام کالا", type: "string" },
  {
    key: "statusId",
    title: "وضعیت",
    label: "وضعیت",
    type: "number",
    render: (value: number, row: InventorySerialDto) =>
      value === IN_STOCK ? (
        <Badge className="bg-success hover:bg-success/90">
          {row.statusTitle}
        </Badge>
      ) : (
        <Badge variant="secondary">{row.statusTitle}</Badge>
      ),
  },
  {
    key: "warehouseTitle",
    title: "انبار",
    label: "انبار",
    type: "string",
    render: (v) => v || "—",
  },
  {
    key: "locationTitle",
    title: "قفسه",
    label: "قفسه",
    type: "string",
    render: (v) => v || "—",
  },
  {
    key: "lastDocNumber",
    title: "آخرین سند",
    label: "آخرین سند",
    type: "number",
    render: (v) => v ?? "—",
  },
];

/** گزارش شماره سریال‌ها: هر سریال الان کجاست و آخرین بار با کدام سند جابه‌جا شده */
export default function InventorySerialsPage() {
  const [warehouses, setWarehouses] = useState<{ id: number; title: string }[]>(
    [],
  );
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    inventoryService
      .getWarehouses({ pageNumber: 1, pageSize: 500 })
      .then((res) => setWarehouses(res.items ?? []))
      .catch((error) => handleApiError(error, "خطا در دریافت لیست انبارها"));
  }, []);

  const extraPayload = useMemo(
    () => ({ warehouseId, status }),
    [warehouseId, status],
  );
  const { tableProps, refresh, totalCount } =
    useServerDataTable<InventorySerialDto>({
      fetcher: inventoryService.searchSerials,
      initialPageSize: 20,
      extraPayload,
    });

  useEffect(() => {
    refresh();
    // با تغییر فیلترهای بالای صفحه دوباره بارگذاری می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, status]);

  const actions = (
    <div className="flex w-full flex-row items-center justify-end gap-1.5 sm:gap-2">
      <Select
        value={warehouseId ? String(warehouseId) : "all"}
        onValueChange={(v) => setWarehouseId(v === "all" ? null : Number(v))}
      >
        <SelectTrigger
          aria-label="انبار"
          className="h-8 w-[130px] shrink-0 bg-background text-xs sm:w-[180px]"
        >
          <SelectValue placeholder="همه انبارها" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه انبارها</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={String(w.id)}>
              {w.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={status ? String(status) : "all"}
        onValueChange={(v) => setStatus(v === "all" ? null : Number(v))}
      >
        <SelectTrigger
          aria-label="وضعیت"
          className="h-8 w-[120px] shrink-0 bg-background text-xs"
        >
          <SelectValue placeholder="همه وضعیت‌ها" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          <SelectItem value="1">در انبار</SelectItem>
          <SelectItem value="2">خارج از انبار</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={refresh}
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="بروزرسانی"
      >
        <RefreshCw size={14} className="text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <ProtectedPage permission="Inventory.Reports.Serials">
      <BaseListLayout
        title="شماره سریال‌ها"
        description="محل فعلی و آخرین سند هر شماره سریال"
        icon={Barcode}
        count={totalCount}
        actions={actions}
      >
        <div className="h-[calc(100vh-180px)] rounded-md border bg-card">
          <DataTable columns={columns} {...tableProps} />
        </div>
      </BaseListLayout>
    </ProtectedPage>
  );
}
