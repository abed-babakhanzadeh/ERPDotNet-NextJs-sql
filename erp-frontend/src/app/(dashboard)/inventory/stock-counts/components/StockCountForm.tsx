"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCheck, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

import MasterDetailForm from "@/components/form/MasterDetailForm";
import AdvancedEditableGrid, {
  GridColumn,
} from "@/components/grid/AdvancedEditableGrid";
import {
  TableLookupCombobox,
  ColumnDef,
} from "@/components/ui/TableLookupCombobox";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTabs } from "@/providers/TabsProvider";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import type { InventoryBatchDto } from "@/types/inventory";
import type { StockCountDto } from "@/types/api";
import StockCountStatusBadge, {
  STOCK_COUNT_FINALIZED,
} from "./StockCountStatusBadge";
import FinalizeStockCountDialog from "./FinalizeStockCountDialog";

/** سطر جدول؛ مقدار شمارش رشته است تا «۰» با «شمرده نشده» (خالی) یکی نشود */
export interface CountRow {
  id?: number;
  productId: number | null;
  productCode?: string;
  productName?: string;
  unitTitle?: string;
  locationId?: number | string | null;
  batchId?: number | string | null;
  systemQuantity: number;
  counted: string;
}

const toRows = (data: StockCountDto): CountRow[] =>
  data.lines.map((l) => ({
    id: l.id,
    productId: l.productId,
    productCode: l.productCode,
    productName: l.productName,
    unitTitle: l.unitTitle,
    locationId: l.locationId,
    batchId: l.batchId,
    systemQuantity: l.systemQuantity,
    counted: l.countedQuantity == null ? "" : String(l.countedQuantity),
  }));

const productLookupColumns: ColumnDef[] = [
  { key: "code", label: "کد", width: "80px" },
  { key: "name", label: "نام", width: "200px" },
  { key: "unitName", label: "واحد", width: "80px" },
];

export default function StockCountForm({
  data,
  onReload,
}: {
  data: StockCountDto;
  onReload: () => Promise<void>;
}) {
  const router = useRouter();
  const { addTab } = useTabs();
  const readOnly = data.statusId === STOCK_COUNT_FINALIZED;
  const [rows, setRows] = useState<CountRow[]>(() => toRows(data));
  const [description, setDescription] = useState(data.description ?? "");
  const [locations, setLocations] = useState<
    { id: number; title: string; code?: string }[]
  >([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [batches, setBatches] = useState<Record<number, InventoryBatchDto[]>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    setRows(toRows(data));
    setDescription(data.description ?? "");
  }, [data]);

  useEffect(() => {
    inventoryService
      .getLocations(data.warehouseId)
      .then((res: any) =>
        setLocations(Array.isArray(res) ? res : (res?.items ?? [])),
      )
      .catch((error) => handleApiError(error, "خطا در دریافت قفسه‌ها"));
  }, [data.warehouseId]);

  // بچ‌ها فقط برای سطرهای جدید لازم است؛ سطرهای سیستمی بچ ثابت دارند
  useEffect(() => {
    const missing = Array.from(
      new Set(
        rows
          .filter((r) => !r.id && r.productId)
          .map((r) => Number(r.productId)),
      ),
    ).filter((pid) => !(pid in batches));
    missing.forEach((pid) =>
      inventoryService
        .getProductBatches(pid, false)
        .then((list) => setBatches((prev) => ({ ...prev, [pid]: list })))
        .catch(() => setBatches((prev) => ({ ...prev, [pid]: [] }))),
    );
  }, [rows, batches]);

  const initial = useMemo(
    () => JSON.stringify([toRows(data), data.description ?? ""]),
    [data],
  );
  const isDirty = !readOnly && JSON.stringify([rows, description]) !== initial;
  const countedCount = rows.filter((r) => r.counted !== "").length;

  const handleProductSearch = useCallback(async (searchTerm: string) => {
    setProductsLoading(true);
    try {
      const res = await inventoryService.searchProducts({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: searchTerm || "",
        sortColumn: "Code",
        sortDescending: false,
        filters: [],
      });
      setProducts(res?.items ?? []);
    } catch (error) {
      handleApiError(error, "خطا در جستجوی کالا");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // سطر سیستمی حذف نمی‌شود؛ «نبودن» کالا با شمارش صفر ثبت می‌شود
  const handleRowsChange = (next: CountRow[]) => {
    const kept = new Set(next.map((r) => r.id).filter(Boolean));
    if (rows.some((r) => r.id && r.systemQuantity !== 0 && !kept.has(r.id))) {
      toast.error(
        "سطر موجودی سیستمی حذف نمی‌شود؛ اگر کالا نیست، شمارش را صفر بزنید.",
      );
      return;
    }
    setRows(next);
  };

  const columns: GridColumn<CountRow>[] = [
    {
      key: "productId",
      title: "کالا",
      type: "custom",
      width: "260px",
      required: true,
      renderEdit: (row, index, _onValue, onRowChange) =>
        row.id ? (
          <div
            className="truncate rounded px-2 py-1.5 text-xs"
            title={row.productName}
          >
            <span className="font-mono text-muted-foreground">
              {row.productCode}
            </span>{" "}
            {row.productName}
          </div>
        ) : (
          <TableLookupCombobox
            value={row.productId}
            onValueChange={(_val, item: any) =>
              item &&
              onRowChange({
                ...row,
                productId: item.id,
                productCode: item.code,
                productName: item.name,
                unitTitle: item.unitName,
                batchId: null,
              })
            }
            items={products}
            columns={productLookupColumns}
            loading={productsLoading}
            onSearch={handleProductSearch}
            placeholder="کد یا نام کالا..."
            ariaLabel={`کالا ردیف ${index + 1}`}
            displayFields={["code", "name"]}
            disabled={readOnly}
          />
        ),
    },
    { key: "unitTitle", title: "واحد", type: "readonly", width: "80px" },
    {
      key: "locationId",
      title: "قفسه",
      type: "custom",
      width: "140px",
      renderEdit: (row, index, onValue) =>
        row.id ? (
          <div className="px-2 py-1.5 text-xs">
            {locations.find((l) => l.id === row.locationId)?.title ?? "—"}
          </div>
        ) : (
          <select
            aria-label={`قفسه ردیف ${index + 1}`}
            disabled={readOnly}
            value={String(row.locationId ?? "")}
            onChange={(e) =>
              onValue(e.target.value ? Number(e.target.value) : null)
            }
            className="h-8 w-full rounded border border-input bg-background px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">انتخاب...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: "batchId",
      title: "بچ",
      type: "custom",
      width: "130px",
      renderEdit: (row, index, onValue) =>
        row.id ? (
          <div className="px-2 py-1.5 font-mono text-xs">
            {data.lines.find((l) => l.id === row.id)?.batchNumber ?? "—"}
          </div>
        ) : (
          <select
            aria-label={`بچ ردیف ${index + 1}`}
            disabled={readOnly || !row.productId}
            value={String(row.batchId ?? "")}
            onChange={(e) =>
              onValue(e.target.value ? Number(e.target.value) : null)
            }
            className="h-8 w-full rounded border border-input bg-background px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">بدون بچ</option>
            {(batches[Number(row.productId)] ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: "systemQuantity",
      title: "موجودی سیستم",
      type: "readonly",
      width: "110px",
      render: (row) => (
        <div className="px-2 py-1.5 text-left font-mono text-xs" dir="ltr">
          {row.systemQuantity}
        </div>
      ),
    },
    {
      key: "counted",
      title: "شمارش",
      type: "number",
      width: "110px",
      disabled: readOnly,
    },
    {
      key: "id",
      title: "اختلاف",
      type: "readonly",
      width: "90px",
      render: (row) => {
        if (row.counted === "")
          return (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">—</div>
          );
        const diff = Number(row.counted) - row.systemQuantity;
        return (
          <div
            dir="ltr"
            className={`px-2 py-1.5 text-left font-mono text-xs ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {diff > 0 ? `+${diff}` : diff}
          </div>
        );
      },
    },
  ];

  const save = async () => {
    if (rows.some((r) => !r.id && (!r.productId || !r.locationId))) {
      toast.error("برای سطر جدید کالا و قفسه را انتخاب کنید");
      return false;
    }
    setSaving(true);
    try {
      await inventoryService.updateStockCount(data.id, {
        id: data.id,
        description: description || null,
        lines: rows.map((r) => ({
          id: r.id ?? null,
          productId: Number(r.productId),
          locationId: r.locationId ? Number(r.locationId) : null,
          batchId: r.batchId ? Number(r.batchId) : null,
          countedQuantity: r.counted === "" ? null : Number(r.counted),
        })),
      });
      toast.success("شمارش ذخیره شد");
      await onReload();
      return true;
    } catch (error) {
      handleApiError(error, "خطا در ذخیره شمارش");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openDoc = (docId: number, number: number | null) =>
    addTab(
      `سند انبار ${number ?? docId}`,
      `/inventory/docs/edit/${docId}?mode=view`,
    );

  return (
    <>
      <MasterDetailForm
        title={`انبارگردانی شماره ${data.id}`}
        isDirty={isDirty}
        submitting={saving}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 text-muted-foreground"
            >
              <ArrowRight className="h-4 w-4 sm:ml-1.5" />
              <span className="sr-only text-xs sm:not-sr-only">بازگشت</span>
            </Button>
            {!readOnly && (
              <>
                <PermissionGuard permission="Inventory.StockCounts.Edit">
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving}
                    className="h-8 gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span className="sr-only text-xs sm:not-sr-only">
                      ذخیره شمارش
                    </span>
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="Inventory.StockCounts.Finalize">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={async () => {
                      if (isDirty && !(await save())) return;
                      setFinalizing(true);
                    }}
                    className="h-8 gap-1.5"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="sr-only text-xs sm:not-sr-only">
                      نهایی کردن
                    </span>
                  </Button>
                </PermissionGuard>
              </>
            )}
          </div>
        }
        headerContent={
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">انبار</Label>
              <div className="font-medium">{data.warehouseTitle}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                تاریخ شمارش
              </Label>
              <div dir="ltr" className="text-right">
                {new Date(data.countDate).toLocaleDateString("fa-IR")}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">وضعیت</Label>
              <div className="flex items-center gap-2">
                <StockCountStatusBadge
                  statusId={data.statusId}
                  title={data.statusTitle}
                />
                <span
                  className="font-mono text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {countedCount} / {rows.length}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                اسناد اصلاحی
              </Label>
              <div className="flex flex-wrap gap-2 text-xs">
                {data.surplusDocId && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      openDoc(data.surplusDocId!, data.surplusDocNumber)
                    }
                  >
                    اضافی: سند {data.surplusDocNumber}{" "}
                    <ExternalLink className="mr-1 h-3 w-3" />
                  </Button>
                )}
                {data.shortageDocId && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      openDoc(data.shortageDocId!, data.shortageDocNumber)
                    }
                  >
                    کسری: سند {data.shortageDocNumber}{" "}
                    <ExternalLink className="mr-1 h-3 w-3" />
                  </Button>
                )}
                {!data.surplusDocId && !data.shortageDocId && (
                  <span className="text-muted-foreground">
                    {readOnly ? "بدون اختلاف" : "پس از نهایی شدن"}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label
                htmlFor="stock-count-description"
                className="text-xs text-muted-foreground"
              >
                توضیحات
              </Label>
              <Textarea
                id="stock-count-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                rows={1}
                className="min-h-[2.25rem] text-sm"
              />
            </div>
          </div>
        }
        tabs={[
          {
            key: "lines",
            label: `اقلام شمارش (${rows.length})`,
            content: (
              <AdvancedEditableGrid
                columns={columns}
                data={rows}
                onChange={handleRowsChange}
                onAddRow={() => ({
                  productId: null,
                  systemQuantity: 0,
                  counted: "",
                  unitTitle: "-",
                })}
                readOnly={readOnly}
                permissions={{
                  add: !readOnly,
                  delete: !readOnly,
                  edit: !readOnly,
                }}
              />
            ),
          },
        ]}
      />
      <FinalizeStockCountDialog
        open={finalizing}
        stockCount={data}
        onClose={() => setFinalizing(false)}
        onFinalized={async () => {
          setFinalizing(false);
          await onReload();
        }}
      />
    </>
  );
}
