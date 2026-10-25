"use client";

import { useMemo, useState } from "react";
import EditableGrid, { type GridColumn } from "@/components/form/EditableGrid";
import { TableLookupCombobox, type ColumnDef } from "@/components/ui/TableLookupCombobox";
import { productService } from "@/services/baseInfoService";
import { OUTPUT_TYPE, type BOMOutputRow } from "./bomFormSchema";

interface ProductLookupDto {
  id: number;
  code: string;
  name: string;
  unitName: string;
}

interface BOMOutputsGridProps {
  rows: BOMOutputRow[];
  onChange: (rows: BOMOutputRow[]) => void;
  readOnly: boolean;
  baseQuantity: number | string;
  error?: string;
}

const lookupColumns: ColumnDef[] = [
  { key: "code", label: "کد کالا/قلم", width: "30%" },
  { key: "name", label: "نام کالا/قلم", width: "50%" },
  { key: "unitName", label: "واحد", width: "20%" },
];

export const newOutputRow = (): BOMOutputRow => ({
  id: Math.random().toString(36).slice(2, 11),
  productId: null,
  type: OUTPUT_TYPE.coProduct,
  quantity: 1,
  costSharePercent: 0,
});

/** جدول محصولات همزاد و فرعی فرمول؛ مقدار هر سطر به ازای مقدار پایه فرمول است */
export default function BOMOutputsGrid({ rows, onChange, readOnly, baseQuantity, error }: BOMOutputsGridProps) {
  const [options, setOptions] = useState<ProductLookupDto[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (term: string) => {
    setLoading(true);
    try {
      const res = await productService.search({ pageNumber: 1, pageSize: 20, searchTerm: term });
      setOptions(res.items as ProductLookupDto[]);
    } finally {
      setLoading(false);
    }
  };

  const update = (index: number, patch: Partial<BOMOutputRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const coProductShare = rows
    .filter((r) => Number(r.type) !== OUTPUT_TYPE.byProduct)
    .reduce((sum, r) => sum + Number(r.costSharePercent || 0), 0);

  const columns: GridColumn<BOMOutputRow>[] = useMemo(
    () => [
      {
        key: "productId",
        title: "کالای خروجی",
        type: "select",
        width: "40%",
        required: true,
        render: (row, index) => (
          <TableLookupCombobox<ProductLookupDto>
            value={row.productId}
            items={options}
            loading={loading}
            columns={lookupColumns}
            searchableFields={["code", "name"]}
            displayFields={["code", "name"]}
            placeholder={row.productName || "جستجو..."}
            ariaLabel={`کالای خروجی ردیف ${index + 1}`}
            disabled={readOnly}
            onSearch={search}
            onOpenChange={(open) => {
              if (open && options.length === 0) search("");
            }}
            onValueChange={(id, item) =>
              update(index, {
                productId: id as number,
                productCode: item?.code,
                productName: item?.name,
                unitName: item?.unitName,
              })
            }
          />
        ),
      },
      {
        key: "type",
        title: "نوع خروجی",
        type: "select",
        width: "18%",
        render: (row, index) => (
          <select
            aria-label={`نوع خروجی ردیف ${index + 1}`}
            className="w-full h-8 border rounded px-1 text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            value={Number(row.type)}
            disabled={readOnly}
            onChange={(e) => {
              const type = Number(e.target.value);
              // محصول فرعی سهمی از بها ندارد
              update(index, type === OUTPUT_TYPE.byProduct ? { type, costSharePercent: 0 } : { type });
            }}
          >
            <option value={OUTPUT_TYPE.coProduct}>محصول همزاد</option>
            <option value={OUTPUT_TYPE.byProduct}>محصول فرعی / ضایعات</option>
          </select>
        ),
      },
      { key: "quantity", title: "مقدار", type: "number", width: "14%", required: true, disabled: readOnly },
      {
        key: "unitName",
        title: "واحد",
        type: "readonly",
        width: "10%",
      },
      {
        key: "costSharePercent",
        title: "سهم بها %",
        type: "number",
        width: "12%",
        disabled: readOnly,
        render: (row, index) => (
          <input
            type="number"
            dir="ltr"
            aria-label={`سهم بها ردیف ${index + 1}`}
            className="w-full h-8 border rounded px-2 text-center font-mono text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
            value={String(row.costSharePercent ?? "")}
            disabled={readOnly || Number(row.type) === OUTPUT_TYPE.byProduct}
            onChange={(e) => update(index, { costSharePercent: e.target.value })}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, options, loading, readOnly],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs leading-5 text-muted-foreground">
        مقدار هر خروجی برای ساخت {Number(baseQuantity) || 1} واحد از محصول اصلی است. محصول همزاد بخشی از
        بهای تمام‌شده را می‌گیرد و باقی‌مانده ({Math.max(0, 100 - coProductShare).toLocaleString("fa-IR")}٪) سهم
        محصول اصلی است؛ محصول فرعی سهمی از بها ندارد.
      </p>
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
      <div className="min-h-0 flex-1 overflow-hidden">
        <EditableGrid<BOMOutputRow>
          columns={columns}
          data={rows}
          onChange={onChange}
          readOnly={readOnly}
          permissions={{ view: true, edit: !readOnly, delete: !readOnly, add: !readOnly }}
          onAddRow={readOnly ? undefined : newOutputRow}
        />
      </div>
    </div>
  );
}
