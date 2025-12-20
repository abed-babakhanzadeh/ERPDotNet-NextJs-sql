"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EditableGrid, { GridColumn } from "@/components/form/EditableGrid";
import { TableLookupCombobox } from "@/components/ui/TableLookupCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import apiClient from "@/services/apiClient";

export interface SubstituteRow {
  id: string;
  substituteProductId: number | null;
  productName?: string;
  productCode?: string;
  priority: number;
  factor: number;
  isMixAllowed: boolean;
  maxMixPercentage: number;
  note: string;
}

interface SubstitutesDialogProps {
  open: boolean;
  onClose: () => void;
  parentProductName: string;
  initialData: SubstituteRow[];
  onSave: (data: SubstituteRow[]) => void;
}

export default function SubstitutesDialog({
  open,
  onClose,
  parentProductName,
  initialData,
  onSave,
}: SubstitutesDialogProps) {
  const [rows, setRows] = useState<SubstituteRow[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // --- اصلاح مهم: پر کردن آپشن‌ها هنگام باز شدن ---
  React.useEffect(() => {
    if (open) {
      // 1. کپی کردن دیتا
      const safeData = initialData?.length
        ? JSON.parse(JSON.stringify(initialData))
        : [];
      setRows(safeData);

      // 2. ساختن آپشن‌های اولیه از روی دیتای موجود
      // تا وقتی مودال باز میشه، اسم کالاها نمایش داده بشه و خالی نباشه
      const initialOptions = safeData
        .filter((r: SubstituteRow) => r.substituteProductId)
        .map((r: SubstituteRow) => ({
          id: r.substituteProductId,
          code: r.productCode || "",
          name: r.productName || "",
        }));

      // حذف تکراری‌ها (اگر یک کالا چند بار جایگزین شده باشد)
      const uniqueOptions = Array.from(
        new Map(initialOptions.map((item: any) => [item.id, item])).values()
      );

      setProductOptions(uniqueOptions);
    }
  }, [open, initialData]);

  const handleProductSearch = async (term: string) => {
    setLoadingProducts(true);
    try {
      const res = await apiClient.post("/BaseInfo/Products/search", {
        pageNumber: 1,
        pageSize: 20,
        searchTerm: term,
      });
      setProductOptions(res.data.items || []);
    } finally {
      setLoadingProducts(false);
    }
  };

  const columns: GridColumn<SubstituteRow>[] = useMemo(
    () => [
      {
        key: "substituteProductId",
        title: "کالای جایگزین",
        type: "select",
        width: "35%",
        required: true,
        render: (row, index) => (
          <TableLookupCombobox
            value={row.substituteProductId}
            items={productOptions} // اینجا حالا مقادیر اولیه را دارد
            loading={loadingProducts}
            columns={[
              { key: "code", label: "کد", width: "30%" },
              { key: "name", label: "نام", width: "70%" },
            ]}
            searchableFields={["code", "name"]}
            displayFields={["code", "name"]}
            placeholder="انتخاب کالا..."
            onSearch={handleProductSearch}
            onOpenChange={(isOpen) => {
              // فقط اگر لیست خالی بود سرچ کن، وگرنه ممکنه مقادیر اولیه رو بپرونه
              if (isOpen && productOptions.length === 0)
                handleProductSearch("");
            }}
            onValueChange={(val, item) => {
              const newRows = [...rows];
              newRows[index] = {
                ...newRows[index],
                substituteProductId: val as number,
                productName: item?.name,
                productCode: item?.code,
              };
              setRows(newRows);
            }}
          />
        ),
      },
      {
        key: "priority",
        title: "اولویت",
        type: "number",
        width: "10%",
        placeholder: "1",
      },
      {
        key: "factor",
        title: "ضریب",
        type: "number",
        width: "12%",
        placeholder: "1.0",
      },
      {
        key: "isMixAllowed",
        title: "میکس؟",
        type: "select",
        width: "10%",
        render: (row, index) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.isMixAllowed}
              onCheckedChange={(checked) => {
                const newRows = [...rows];
                newRows[index].isMixAllowed = checked === true;
                if (checked !== true) newRows[index].maxMixPercentage = 0;
                setRows(newRows);
              }}
            />
          </div>
        ),
      },
      {
        key: "maxMixPercentage",
        title: "میکس %",
        type: "number",
        width: "12%",
        disabled: false,
        render: (row, index) => (
          <input
            type="number"
            className="w-full h-8 border rounded px-2 text-center disabled:bg-muted disabled:text-muted-foreground"
            value={row.maxMixPercentage}
            disabled={!row.isMixAllowed}
            onChange={(e) => {
              const newRows = [...rows];
              newRows[index].maxMixPercentage = Number(e.target.value);
              setRows(newRows);
            }}
          />
        ),
      },
      { key: "note", title: "توضیحات", type: "text", width: "20%" },
    ],
    [rows, productOptions, loadingProducts]
  );

  const handleSave = () => {
    // فیلتر کردن ردیف‌های ناقص قبل از ذخیره در استیت محلی
    const validRows = rows.filter((r) => r.substituteProductId);
    onSave(validRows);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0">
        <DialogDescription className="sr-only">
          پنجره مدیریت کالاهای جایگزین
        </DialogDescription>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            جایگزین‌ها برای:{" "}
            <span className="text-primary">{parentProductName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-4 overflow-hidden bg-muted/10">
          <EditableGrid<SubstituteRow>
            columns={columns}
            data={rows}
            onChange={setRows}
            onAddRow={() => ({
              id: Math.random().toString(36).substr(2, 9),
              substituteProductId: null,
              priority: rows.length + 1,
              factor: 1,
              isMixAllowed: false,
              maxMixPercentage: 0,
              note: "",
            })}
          />
        </div>
        <DialogFooter className="px-6 py-4 border-t gap-2 bg-background">
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={handleSave}>تایید</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
