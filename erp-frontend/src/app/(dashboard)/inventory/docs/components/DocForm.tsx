"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Printer } from "lucide-react";

import MasterDetailForm from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import AdvancedEditableGrid, {
  GridColumn,
} from "@/components/grid/AdvancedEditableGrid";
import { Button } from "@/components/ui/button";
import {
  TableLookupCombobox,
  ColumnDef,
} from "@/components/ui/TableLookupCombobox";

import inventoryService from "@/services/inventoryService";
import {
  CreateInventoryDocCommand,
  UpdateInventoryDocCommand,
  InventoryDocDto,
} from "@/types/inventory";

interface DocFormProps {
  mode: "create" | "edit";
  initialData?: InventoryDocDto;
  docTypes: any[];
  warehouses: any[];
}

export default function DocForm({
  mode,
  initialData,
  docTypes,
  warehouses,
}: DocFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [headerData, setHeaderData] = useState<any>({
    docTypeId: initialData?.docTypeId || null,
    warehouseId: initialData?.warehouseId || null,
    destinationWarehouseId: initialData?.destinationWarehouseId || null,
    docDate: initialData?.docDate ? new Date(initialData.docDate) : new Date(),
    description: initialData?.description || "",
    targetPartyName: initialData?.targetPartyName || "",
    referenceExternalCode: initialData?.referenceExternalCode || "",
  });

  const [gridData, setGridData] = useState<any[]>(
    initialData?.details.map((d) => ({
      ...d,
      tempId: d.id,
      productName: d.productName,
      unitTitle: d.unitTitle,
    })) || [],
  );

  const [locations, setLocations] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (headerData.warehouseId) {
      loadLocations(headerData.warehouseId);
    }
  }, [headerData.warehouseId]);

  const loadLocations = async (warehouseId: number) => {
    try {
      const locs = await inventoryService.getLocations(warehouseId);
      setLocations(locs || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleProductSearch = useCallback(async (searchTerm: string) => {
    setProductsLoading(true);
    try {
      const response = await inventoryService.searchProducts({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: searchTerm || "",
        sortColumn: "Code",
        sortDescending: false,
        Filters: [],
      });
      if (response?.items) {
        setProductsList(response.items);
      }
    } catch (error) {
      console.error("خطا در جستجوی کالا", error);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const productLookupColumns: ColumnDef[] = [
    { key: "code", label: "کد کالا", width: "80px" },
    { key: "name", label: "نام کالا", width: "200px" },
    { key: "unitName", label: "واحد", width: "80px" },
    { key: "supplyType", label: "نوع", width: "100px" },
  ];

  const headerFields: FieldConfig[] = [
    {
      name: "docTypeId",
      label: "نوع سند",
      type: "select",
      options: docTypes.map((dt) => ({ label: dt.title, value: dt.id })),
      required: true,
      colSpan: 1,
      disabled: mode === "edit",
    },
    {
      name: "warehouseId",
      label: "انبار",
      type: "select",
      options: warehouses.map((w) => ({ label: w.title, value: w.id })),
      required: true,
      colSpan: 1,
      disabled: mode === "edit",
    },
    {
      name: "docDate",
      label: "تاریخ سند",
      type: "date",
      required: true,
      colSpan: 1,
    },
    {
      name: "targetPartyName",
      label: "طرف حساب / تحویل گیرنده",
      type: "text",
      colSpan: 1,
    },
    {
      name: "referenceExternalCode",
      label: "شماره عطف / بارنامه",
      type: "text",
      colSpan: 1,
    },
    {
      name: "destinationWarehouseId",
      label: "انبار مقصد",
      type: "select",
      options: warehouses.map((w) => ({ label: w.title, value: w.id })),
      colSpan: 1,
    },
    {
      name: "description",
      label: "توضیحات کلی",
      type: "textarea",
      colSpan: 3,
    },
  ];

  const gridColumns: GridColumn<any>[] = useMemo(
    () => [
      {
        key: "productId",
        title: "کالا",
        type: "custom", // استفاده از قابلیت گرید جدید
        width: "350px",
        required: true,
        renderEdit: (row, index, onValueChange, onRowChange) => (
          <TableLookupCombobox
            value={row.productId}
            onValueChange={(val, item: any) => {
              if (item) {
                onRowChange({
                  ...row,
                  productId: item.id,
                  productCode: item.code,
                  productName: item.name,
                  unitTitle: item.unitName,
                });
              } else {
                onValueChange(null);
              }
            }}
            items={productsList}
            columns={productLookupColumns}
            loading={productsLoading}
            onSearch={handleProductSearch}
            placeholder="جستجوی کالا (کد/نام)..."
            displayFields={["code", "name"]}
          />
        ),
      },
      {
        key: "unitTitle",
        title: "واحد",
        type: "readonly",
        width: "80px",
      },
      {
        key: "mainUnitQuantity",
        title: "تعداد",
        type: "number",
        width: "100px",
        required: true,
      },
      {
        key: "locationId",
        title: "شلف/قفسه",
        type: "select",
        width: "150px",
        options: locations.map((l) => ({ label: l.title, value: l.id })),
      },
      {
        key: "batchNumber",
        title: "بچ نامبر",
        type: "text",
        width: "150px",
        placeholder: "اختیاری",
      },
      {
        key: "description",
        title: "توضیحات ردیف",
        type: "text",
        width: "200px",
      },
    ],
    [locations, productsList, productsLoading],
  );

  const handleSubmit = async () => {
    if (!headerData.docTypeId || !headerData.warehouseId) {
      toast.error("لطفا نوع سند و انبار را انتخاب کنید.");
      return;
    }
    if (gridData.length === 0) {
      toast.error("لطفا حداقل یک کالا به سند اضافه کنید.");
      return;
    }
    const invalidRow = gridData.find(
      (r) =>
        !r.productId || !r.mainUnitQuantity || Number(r.mainUnitQuantity) <= 0,
    );
    if (invalidRow) {
      toast.error("لطفا کالا و تعداد معتبر برای همه ردیف‌ها وارد کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const detailsDto = gridData.map((row) => ({
        id: row.id || null,
        productId: Number(row.productId),
        mainUnitQuantity: Number(row.mainUnitQuantity),
        subUnitQuantity: 0,
        locationId: row.locationId ? Number(row.locationId) : null,
        batchId: null,
        description: row.description,
      }));

      if (mode === "create") {
        const command: CreateInventoryDocCommand = {
          ...headerData,
          details: detailsDto,
        };
        await inventoryService.createDoc(command);
        toast.success("سند با موفقیت ثبت شد");
        router.push("/inventory/docs");
      } else {
        if (!initialData) return;
        const command: UpdateInventoryDocCommand = {
          id: initialData.id,
          docDate: headerData.docDate,
          description: headerData.description,
          warehouseId: headerData.warehouseId,
          rowVersion: initialData.rowVersion,
          details: detailsDto,
        };
        await inventoryService.updateDoc(initialData.id, command);
        toast.success("سند ویرایش شد");
        router.push("/inventory/docs");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در ذخیره سند");
    } finally {
      setSubmitting(false);
    }
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.back()}>
        انصراف
      </Button>
      {mode === "edit" && (
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="w-4 h-4 ml-2" />
          چاپ
        </Button>
      )}
      <Button onClick={handleSubmit} disabled={submitting}>
        <Save className="w-4 h-4 ml-2" />
        {submitting ? "در حال ذخیره..." : "ثبت نهایی"}
      </Button>
    </div>
  );

  return (
    <MasterDetailForm
      title={
        mode === "create"
          ? "ثبت سند انبار جدید"
          : `ویرایش سند شماره ${initialData?.docNumber}`
      }
      headerActions={headerActions}
      headerContent={
        <div className="p-4 bg-card border rounded-md mb-4 shadow-sm">
          <AutoForm
            fields={headerFields}
            data={headerData}
            onChange={(name, val) =>
              setHeaderData({ ...headerData, [name]: val })
            }
          />
        </div>
      }
      tabs={[
        {
          key: "items",
          label: "اقلام سند",
          content: (
            <div className="h-[400px] border rounded-md bg-card">
              <AdvancedEditableGrid
                columns={gridColumns}
                data={gridData}
                onChange={setGridData}
                onAddRow={() => ({
                  id: null,
                  productId: null,
                  productName: "",
                  unitTitle: "-",
                  mainUnitQuantity: 1,
                  description: "",
                })}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
