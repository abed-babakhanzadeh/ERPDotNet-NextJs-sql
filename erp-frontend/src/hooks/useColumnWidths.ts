import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnConfig } from "@/types";

export const COLUMN_MIN_WIDTH = 80;
export const COLUMN_MAX_WIDTH = 600;
const DEFAULT_WIDTH = 150;
const STORAGE_PREFIX = "erp-table-widths:";

const clamp = (value: number, min = COLUMN_MIN_WIDTH) =>
  Math.round(Math.min(COLUMN_MAX_WIDTH, Math.max(min, value)));

function readSaved(storageKey: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + storageKey) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    // داده localStorage قابل دستکاری است؛ فقط اعداد معتبر پذیرفته می‌شوند
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

/**
 * عرض ستون‌های جدول: پیش‌فرض از ColumnConfig.width، محدود به min/max،
 * و ذخیره چیدمان هر کاربر در مرورگر (کلید جداگانه برای هر جدول).
 */
export function useColumnWidths(columns: ColumnConfig[], storageKey: string) {
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        columns.map((c) => [c.key, clamp(c.width ?? DEFAULT_WIDTH, c.minWidth)]),
      ),
    [columns],
  );
  const minWidths = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.minWidth ?? COLUMN_MIN_WIDTH])),
    [columns],
  );

  const [saved, setSaved] = useState<Record<string, number>>({});

  // خواندن بعد از mount تا خروجی سرور و کلاینت یکسان بماند
  useEffect(() => {
    setSaved(readSaved(storageKey));
  }, [storageKey]);

  const widthOf = useCallback(
    (key: string) =>
      saved[key] !== undefined ? clamp(saved[key], minWidths[key]) : (defaults[key] ?? DEFAULT_WIDTH),
    [saved, defaults, minWidths],
  );

  const setWidth = useCallback(
    (key: string, width: number) => {
      setSaved((prev) => {
        const next = { ...prev, [key]: clamp(width, minWidths[key]) };
        try {
          localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(next));
        } catch {
          // ذخیره نشدن چیدمان (حالت خصوصی یا پر بودن حافظه) نباید جدول را از کار بیندازد
        }
        return next;
      });
    },
    [storageKey, minWidths],
  );

  return { widthOf, setWidth, minWidthOf: (key: string) => minWidths[key] ?? COLUMN_MIN_WIDTH };
}
