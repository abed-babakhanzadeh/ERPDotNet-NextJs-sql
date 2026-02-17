"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Printer,
  CheckCircle2,
  Archive,
  Undo2,
  ArrowRight,
  MoreVertical,
  FileText,
  AlertTriangle,
  Loader2,
  Pencil,
  Ban,
} from "lucide-react";

import MasterDetailForm from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import AdvancedEditableGrid, {
  GridColumn,
} from "@/components/grid/AdvancedEditableGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TableLookupCombobox,
  ColumnDef,
} from "@/components/ui/TableLookupCombobox";
import PermissionGuard from "@/components/ui/PermissionGuard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { handleApiError } from "@/lib/error-handling";
import inventoryService from "@/services/inventoryService";
import {
  CreateInventoryDocCommand,
  UpdateInventoryDocCommand,
  InventoryDocDto,
  InventoryDocStatus,
} from "@/types/inventory";

interface DocFormProps {
  mode: "create" | "edit" | "view";
  initialData?: InventoryDocDto;
  docTypes: any[];
  warehouses: any[];
}

const statusStyles: Record<
  number,
  { label: string; className: string; icon?: any }
> = {
  [InventoryDocStatus.Draft]: {
    label: "پیش‌نویس",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileText,
  },
  [InventoryDocStatus.Submitted]: {
    label: "ارسال شده",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: ArrowRight,
  },
  [InventoryDocStatus.Approved]: {
    label: "تایید شده",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: CheckCircle2,
  },
  [InventoryDocStatus.Posted]: {
    label: "قطعی شده (کاردکس)",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Archive,
  },
  [InventoryDocStatus.Rejected]: {
    label: "رد شده",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
  [InventoryDocStatus.Cancelled]: {
    label: "ابطال شده",
    className:
      "bg-gray-100 text-gray-400 border-gray-200 line-through decoration-gray-400",
    icon: Ban,
  },
};

export default function DocForm({
  mode: initialMode,
  initialData: serverInitialData,
  docTypes,
  warehouses,
}: DocFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [docData, setDocData] = useState<InventoryDocDto | undefined>(
    serverInitialData,
  );
  const [currentMode, setCurrentMode] = useState(initialMode);

  const [submitting, setSubmitting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const [headerData, setHeaderData] = useState<any>({});
  const [gridData, setGridData] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // === Sync Data (پر کردن فرم) ===
  useEffect(() => {
    if (docData) {
      // حالت ویرایش/نمایش
      setHeaderData({
        docTypeId: docData.docTypeId,
        warehouseId: docData.warehouseId,
        destinationWarehouseId: docData.destinationWarehouseId,
        docDate: docData.docDate ? new Date(docData.docDate) : new Date(),
        description: docData.description || "",
        targetPartyName: docData.targetPartyName || "",
        referenceExternalCode: docData.referenceExternalCode || "",
      });

      setGridData(docData.details.map((d) => ({ ...d, tempId: d.id })) || []);

      // پر کردن کش کالاها
      const existingProducts = docData.details.map((d) => ({
        id: d.productId,
        code: d.productCode,
        name: d.productName,
        unitName: d.unitTitle,
      }));
      setProductsList((prev) => {
        const combined = [...prev];
        existingProducts.forEach((p) => {
          if (!combined.find((x) => x.id === p.id)) combined.push(p);
        });
        return combined;
      });

      if (docData.warehouseId) loadLocations(docData.warehouseId);
    } else if (initialMode === "create") {
      // ✅ اصلاح مشکل تاریخ خالی: مقداردهی اولیه برای حالت ایجاد
      setHeaderData({
        docDate: new Date(),
        description: "",
        targetPartyName: "",
        referenceExternalCode: "",
      });
    }
  }, [docData, initialMode]); // وابستگی‌ها اصلاح شد

  const loadLocations = async (warehouseId: number) => {
    try {
      const locs = await inventoryService.getLocations(warehouseId);
      setLocations(locs || []);
    } catch (error) {
      console.error(error);
    }
  };

  const reloadDocument = async () => {
    if (!docData?.id) return;
    setIsReloading(true);
    try {
      const freshDoc = await inventoryService.getDocById(docData.id);
      setDocData(freshDoc);
    } catch (error) {
      handleApiError(error, "خطا در بازخوانی اطلاعات سند.");
    } finally {
      setIsReloading(false);
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
      if (response?.items) setProductsList(response.items);
    } catch (error) {
      console.error(error);
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

  const currentStatus = docData?.status || InventoryDocStatus.Draft;
  const isReadOnly =
    currentMode === "view" ||
    currentStatus === InventoryDocStatus.Posted ||
    currentStatus === InventoryDocStatus.Cancelled;
  const statusInfo = statusStyles[currentStatus];
  const StatusIcon = statusInfo?.icon || FileText;

  const headerFields: FieldConfig[] = [
    {
      name: "docTypeId",
      label: "نوع سند",
      type: "select",
      options: docTypes.map((dt) => ({ label: dt.title, value: dt.id })),
      required: true,
      colSpan: 1,
      disabled: currentMode !== "create",
    },
    {
      name: "warehouseId",
      label: "انبار",
      type: "select",
      options: warehouses.map((w) => ({ label: w.title, value: w.id })),
      required: true,
      colSpan: 1,
      disabled: currentMode !== "create",
    },
    {
      name: "docDate",
      label: "تاریخ سند",
      type: "date",
      required: true,
      colSpan: 1,
      disabled: isReadOnly,
    },
    {
      name: "targetPartyName",
      label: "طرف حساب",
      type: "text",
      colSpan: 1,
      disabled: isReadOnly,
    },
    {
      name: "referenceExternalCode",
      label: "شماره عطف",
      type: "text",
      colSpan: 1,
      disabled: isReadOnly,
    },
    {
      name: "destinationWarehouseId",
      label: "انبار مقصد",
      type: "select",
      options: warehouses.map((w) => ({ label: w.title, value: w.id })),
      colSpan: 1,
      disabled: isReadOnly,
    },
    {
      name: "description",
      label: "توضیحات",
      type: "textarea",
      colSpan: 3,
      disabled: isReadOnly,
    },
  ];

  const gridColumns: GridColumn<any>[] = useMemo(
    () => [
      {
        key: "productId",
        title: "کالا",
        type: "custom",
        width: "300px",
        required: true,
        renderEdit: (row, index, onValueChange, onRowChange) => (
          <TableLookupCombobox
            value={row.productId}
            onValueChange={(val, item: any) => {
              if (item)
                onRowChange({
                  ...row,
                  productId: item.id,
                  productCode: item.code,
                  productName: item.name,
                  unitTitle: item.unitName,
                });
              else onValueChange(null);
            }}
            items={productsList}
            columns={productLookupColumns}
            loading={productsLoading}
            onSearch={handleProductSearch}
            placeholder="کد یا نام کالا..."
            displayFields={["code", "name"]}
            disabled={isReadOnly}
          />
        ),
      },
      { key: "unitTitle", title: "واحد", type: "readonly", width: "80px" },
      {
        key: "mainUnitQuantity",
        title: "تعداد",
        type: "number",
        width: "100px",
        required: true,
        disabled: isReadOnly,
      },
      {
        key: "locationId",
        title: "شلف/قفسه",
        type: "select",
        width: "150px",
        options: locations.map((l) => ({ label: l.title, value: l.id })),
        disabled: isReadOnly,
      },
      {
        key: "batchNumber",
        title: "بچ نامبر",
        type: "text",
        width: "150px",
        placeholder: "-",
        disabled: isReadOnly,
      },
      {
        key: "description",
        title: "توضیحات ردیف",
        type: "text",
        width: "200px",
        disabled: isReadOnly,
      },
    ],
    [locations, productsList, productsLoading, isReadOnly],
  );

  // === Handlers (Save, Approve, Post, Revert) ===
  const handleSave = async () => {
    if (!headerData.docTypeId || !headerData.warehouseId)
      return toast.error("نوع سند و انبار الزامی است.");
    if (gridData.length === 0)
      return toast.error("حداقل یک ردیف کالا وارد کنید.");
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
      if (currentMode === "create") {
        const command: CreateInventoryDocCommand = {
          ...headerData,
          details: detailsDto,
        };
        const newId = await inventoryService.createDoc(command);
        toast.success("سند جدید ایجاد شد");
        router.push(`/inventory/docs/edit/${newId}`);
      } else {
        if (!docData) return;
        const command: UpdateInventoryDocCommand = {
          id: docData.id,
          docDate: headerData.docDate,
          description: headerData.description,
          warehouseId: headerData.warehouseId,
          rowVersion: docData.rowVersion,
          details: detailsDto,
        };
        await inventoryService.updateDoc(docData.id, command);
        toast.success("تغییرات ذخیره شد");
        await reloadDocument();
      }
    } catch (error: any) {
      handleApiError(error, "خطا در ذخیره سازی");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("آیا از تایید نهایی سند اطمینان دارید؟")) return;
    setSubmitting(true);
    try {
      await inventoryService.approveDoc(docData!.id, docData!.rowVersion);
      toast.success("سند تایید شد");
      await reloadDocument();
    } catch (error: any) {
      handleApiError(error, "خطا در تایید سند");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (
      !confirm(
        "هشدار: قطعی سازی باعث کسر/افزایش موجودی شده و غیرقابل بازگشت است.\nآیا ادامه می‌دهید؟",
      )
    )
      return;
    setSubmitting(true);
    try {
      await inventoryService.postDoc(docData!.id, docData!.rowVersion);
      toast.success("سند قطعی شد");
      await reloadDocument();
    } catch (error: any) {
      handleApiError(error, "خطا در قطعی سازی سند");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async () => {
    const isPosted = currentStatus === InventoryDocStatus.Posted;
    const msg = isPosted
      ? "آیا از ابطال این سند اطمینان دارید؟"
      : "سند به پیش‌نویس برگردد؟";
    if (!confirm(msg)) return;
    setSubmitting(true);
    try {
      await inventoryService.revertDoc(docData!.id);
      toast.success(isPosted ? "سند ابطال شد" : "سند اصلاح شد");
      await reloadDocument();
    } catch (error: any) {
      handleApiError(error, "خطا در عملیات");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchToEdit = () => {
    router.push(pathname);
    setCurrentMode("edit");
  };

  // === Action Menu ===
  const ActionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3">
          <span className="hidden sm:inline">عملیات</span>
          <MoreVertical className="w-4 h-4 sm:ml-1.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>اقدامات سند</DropdownMenuLabel>
        {currentMode === "view" &&
          currentStatus === InventoryDocStatus.Draft && (
            <DropdownMenuItem onClick={handleSwitchToEdit}>
              <Pencil className="w-4 h-4 ml-2" />
              ویرایش سند
            </DropdownMenuItem>
          )}
        {currentMode !== "view" && !isReadOnly && (
          <DropdownMenuItem
            onClick={handleSave}
            disabled={submitting}
            className="sm:hidden"
          >
            <Save className="w-4 h-4 ml-2" />
            ذخیره موقت
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer className="w-4 h-4 ml-2" />
          چاپ سند
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {currentStatus === InventoryDocStatus.Draft &&
          currentMode === "edit" && (
            <PermissionGuard permission="Inventory.Docs.Edit">
              <DropdownMenuItem
                onClick={handleApprove}
                disabled={submitting}
                className="text-emerald-600"
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                تایید نهایی
              </DropdownMenuItem>
            </PermissionGuard>
          )}
        {currentStatus === InventoryDocStatus.Approved &&
          currentMode === "edit" && (
            <>
              <DropdownMenuItem
                onClick={handleRevert}
                disabled={submitting}
                className="text-amber-600"
              >
                <Undo2 className="w-4 h-4 ml-2" />
                اصلاح (برگشت)
              </DropdownMenuItem>
              <PermissionGuard permission="Inventory.Docs.Create">
                <DropdownMenuItem
                  onClick={handlePost}
                  disabled={submitting}
                  className="text-blue-600 font-bold"
                >
                  <Archive className="w-4 h-4 ml-2" />
                  قطعی سازی
                </DropdownMenuItem>
              </PermissionGuard>
            </>
          )}
        {currentStatus === InventoryDocStatus.Posted && (
          <PermissionGuard permission="Inventory.Docs.Create">
            <DropdownMenuItem
              onClick={handleRevert}
              disabled={submitting}
              className="text-red-600 font-bold"
            >
              <Ban className="w-4 h-4 ml-2" />
              ابطال سند
            </DropdownMenuItem>
          </PermissionGuard>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MasterDetailForm
      title={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">
              {currentMode === "create"
                ? "ثبت سند جدید"
                : `سند انبار شماره ${docData?.docNumber}`}
            </h1>
            {currentMode !== "create" && (
              <Badge
                variant="outline"
                className={`gap-1.5 px-2.5 py-0.5 rounded-full ${statusInfo?.className}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo?.label}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            {currentMode === "create"
              ? "اطلاعات اولیه سند را وارد کنید"
              : `تاریخ: ${new Date(headerData.docDate).toLocaleDateString("fa-IR")}`}
          </span>
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            انصراف
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            {currentStatus === InventoryDocStatus.Draft &&
              currentMode !== "view" && (
                <Button
                  onClick={handleSave}
                  disabled={submitting}
                  size="sm"
                  className="h-9 gap-1.5 bg-primary"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات</span>
                </Button>
              )}
            {currentStatus === InventoryDocStatus.Approved && (
              <Button
                onClick={handlePost}
                disabled={submitting}
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Archive className="w-4 h-4" />
                <span>قطعی سازی</span>
              </Button>
            )}
          </div>
          {currentMode !== "create" && <ActionMenu />}
          {currentMode === "create" && (
            <Button
              onClick={handleSave}
              disabled={submitting}
              size="sm"
              className="h-9 gap-1.5 bg-primary"
            >
              <Save className="w-4 h-4" />
              <span>ثبت سند</span>
            </Button>
          )}
        </div>
      }
      headerContent={
        <div className="p-4 bg-card border rounded-lg mb-4 shadow-sm relative">
          {isReloading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
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
          label: `اقلام سند (${gridData.length})`,
          content: (
            // ✅ اصلاح ارتفاع برای حذف اسکرول بیرونی: h-[calc(100vh-350px)]
            <div className="h-[calc(100vh-350px)] min-h-[400px] border rounded-lg bg-card shadow-sm overflow-hidden relative">
              {isReloading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              )}
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
                readOnly={isReadOnly}
                permissions={{
                  add: !isReadOnly,
                  delete: !isReadOnly,
                  edit: !isReadOnly,
                }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
