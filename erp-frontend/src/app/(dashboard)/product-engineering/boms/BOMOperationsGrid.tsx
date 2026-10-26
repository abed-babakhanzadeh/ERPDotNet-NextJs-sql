"use client";

import { useEffect, useMemo, useState } from "react";
import EditableGrid, { type GridColumn } from "@/components/form/EditableGrid";
import { workCenterService } from "@/services/productionService";
import { handleApiError } from "@/lib/error-handling";
import type { WorkCenterOptionDto } from "@/types/api";
import type { BOMOperationRow } from "./bomFormSchema";

interface BOMOperationsGridProps {
  rows: BOMOperationRow[];
  onChange: (rows: BOMOperationRow[]) => void;
  readOnly: boolean;
  baseQuantity: number | string;
  error?: string;
}

/** ترتیب پیشنهادی عملیات بعدی: ۱۰، ۲۰، ۳۰ ... تا بعداً بتوان بین آن‌ها عملیات اضافه کرد */
const nextSequence = (rows: BOMOperationRow[]) =>
  Math.max(0, ...rows.map((r) => Number(r.sequence) || 0)) + 10;

/** مسیر تولید فرمول: عملیات به ترتیب اجرا، مرکز کاری و زمان‌ها */
export default function BOMOperationsGrid({ rows, onChange, readOnly, baseQuantity, error }: BOMOperationsGridProps) {
  const [workCenters, setWorkCenters] = useState<WorkCenterOptionDto[]>([]);

  useEffect(() => {
    workCenterService
      .options()
      .then(setWorkCenters)
      .catch((e) => handleApiError(e, "خطا در دریافت مراکز کاری"));
  }, []);

  const update = (index: number, patch: Partial<BOMOperationRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const columns: GridColumn<BOMOperationRow>[] = useMemo(
    () => [
      { key: "sequence", title: "ترتیب", type: "number", width: "10%", required: true, disabled: readOnly },
      { key: "title", title: "عنوان عملیات", type: "text", width: "26%", required: true, disabled: readOnly },
      {
        key: "workCenterId",
        title: "مرکز کاری",
        type: "select",
        width: "24%",
        required: true,
        render: (row, index) => (
          <select
            aria-label={`مرکز کاری عملیات ${index + 1}`}
            className="w-full h-8 border rounded px-1 text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            value={row.workCenterId ?? ""}
            disabled={readOnly}
            onChange={(e) => update(index, { workCenterId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">انتخاب کنید</option>
            {workCenters
              .filter((w) => w.isActive || w.id === row.workCenterId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.title}
                  {w.isActive ? "" : " (غیرفعال)"}
                </option>
              ))}
          </select>
        ),
      },
      { key: "setupMinutes", title: "آماده‌سازی (دقیقه)", type: "number", width: "14%", disabled: readOnly },
      { key: "runMinutes", title: "اجرا (دقیقه)", type: "number", width: "12%", disabled: readOnly },
      { key: "description", title: "توضیحات", type: "text", width: "14%", disabled: readOnly },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, workCenters, readOnly],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs leading-5 text-muted-foreground">
        عملیات به ترتیب اجرا می‌شوند. زمان آماده‌سازی یک بار برای هر سفارش و زمان اجرا برای ساخت{" "}
        {(Number(baseQuantity) || 1).toLocaleString("fa-IR")} واحد (مقدار پایه فرمول) است.
      </p>
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
      <div className="min-h-0 flex-1 overflow-hidden">
        <EditableGrid<BOMOperationRow>
          columns={columns}
          data={rows}
          onChange={onChange}
          readOnly={readOnly}
          permissions={{ view: true, edit: !readOnly, delete: !readOnly, add: !readOnly }}
          onAddRow={
            readOnly
              ? undefined
              : () => ({
                  id: Math.random().toString(36).slice(2, 11),
                  sequence: nextSequence(rows),
                  title: "",
                  workCenterId: null,
                  setupMinutes: 0,
                  runMinutes: 0,
                  description: "",
                })
          }
        />
      </div>
    </div>
  );
}
