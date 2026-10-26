import { useEffect, useState } from "react";

import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import type { SelectOption } from "@/components/form/fields";
import type { InventoryNature } from "@/types/inventory";

const asList = (res: unknown) =>
  (Array.isArray(res) ? res : ((res as { items?: unknown[] })?.items ?? [])) as {
    id: number;
    title: string;
    natureValue?: number;
  }[];

/**
 * گزینه‌های مقصد سند انبار برای اسناد تولید: انواع سند با ماهیت داده‌شده،
 * انبارهای در دسترس کاربر و قفسه‌های انبار انتخاب‌شده
 */
export function useDocTargetOptions(open: boolean, nature: InventoryNature, warehouseId: number) {
  const [docTypes, setDocTypes] = useState<SelectOption[]>([]);
  const [warehouses, setWarehouses] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!open) return;
    inventoryService
      .getAllDocTypes()
      .then((res: unknown) =>
        setDocTypes(asList(res).filter((t) => t.natureValue === nature).map((t) => ({ label: t.title, value: t.id }))),
      )
      .catch((error) => handleApiError(error, "خطا در دریافت انواع سند"));
    inventoryService
      .getAllWarehouses()
      .then((res: unknown) => setWarehouses(asList(res).map((w) => ({ label: w.title, value: w.id }))))
      .catch((error) => handleApiError(error, "خطا در دریافت لیست انبارها"));
  }, [open, nature]);

  useEffect(() => {
    if (!open || !warehouseId) return setLocations([]);
    inventoryService
      .getLocations(warehouseId)
      .then((res: unknown) => setLocations(asList(res).map((l) => ({ label: l.title, value: l.id }))))
      .catch((error) => handleApiError(error, "خطا در دریافت قفسه‌ها"));
  }, [open, warehouseId]);

  return { docTypes, warehouses, locations };
}
