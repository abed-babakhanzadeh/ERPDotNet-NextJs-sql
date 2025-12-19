"use client";

import { useState, useEffect } from "react";
import { MRT_ColumnOrderState, MRT_VisibilityState } from "mantine-react-table";

export function useTablePersistence(tableId: string) {
  // کلید ذخیره‌سازی در لوکال استوریج
  const storageKey = `table-state-${tableId}`;

  // State های جدول که می‌خواهیم ذخیره شوند
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<MRT_ColumnOrderState>([]);
  const [density, setDensity] = useState<'xs' | 'md' | 'xl'>('md');

  // 1. لود کردن تنظیمات هنگام باز شدن صفحه
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.columnVisibility) setColumnVisibility(parsed.columnVisibility);
      if (parsed.columnOrder) setColumnOrder(parsed.columnOrder);
      if (parsed.density) setDensity(parsed.density);
    }
  }, [tableId]);

  // 2. ذخیره کردن تنظیمات هر وقت تغییری رخ داد
  useEffect(() => {
    // یک تاخیر کوچک (Debounce) برای جلوگیری از ذخیره مکرر
    const timer = setTimeout(() => {
      const stateToSave = { columnVisibility, columnOrder, density };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }, 500);
    return () => clearTimeout(timer);
  }, [columnVisibility, columnOrder, density, tableId]);

  return {
    // این آبجکت را مستقیم به جدول پاس می‌دهیم
    state: {
      columnVisibility,
      columnOrder,
      density,
    },
    // هندلرها
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onDensityChange: setDensity,
  };
}