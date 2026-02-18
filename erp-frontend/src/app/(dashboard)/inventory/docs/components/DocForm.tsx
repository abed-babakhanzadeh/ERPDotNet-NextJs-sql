"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
    label: "قطعی شده",
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

  const isInitialized = useRef(false);

  // --- Draft Logic (Same as before) ---
  const getDraftKey = () => {
    if (initialMode === "create") return "inventory-doc-draft-new";
    if (docData?.id) return `inventory-doc-draft-${docData.id}`;
    return null;
  };

  useEffect(() => {
    const initData = async () => {
      const draftKey = getDraftKey();
      const savedDraft = draftKey ? sessionStorage.getItem(draftKey) : null;
      let loadedFromDraft = false;

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setHeaderData(parsed.headerData);
          setGridData(parsed.gridData);
          if (parsed.productsList) setProductsList(parsed.productsList);
          if (parsed.headerData.warehouseId)
            loadLocations(Number(parsed.headerData.warehouseId));
          loadedFromDraft = true;
        } catch (e) {
          console.error(e);
        }
      }

      if (!loadedFromDraft) {
        if (docData) {
          setHeaderData({
            docTypeId: docData.docTypeId,
            warehouseId: docData.warehouseId,
            destinationWarehouseId: docData.destinationWarehouseId,
            docDate: docData.docDate ? new Date(docData.docDate) : new Date(),
            description: docData.description || "",
            targetPartyName: docData.targetPartyName || "",
            referenceExternalCode: docData.referenceExternalCode || "",
          });
          setGridData(
            docData.details.map((d) => ({ ...d, tempId: d.id })) || [],
          );
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
          setHeaderData({
            docDate: new Date(),
            description: "",
            targetPartyName: "",
            referenceExternalCode: "",
          });
        }
      }
      isInitialized.current = true;
    };
    initData();
  }, [docData, initialMode]);

  useEffect(() => {
    if (!isInitialized.current || currentMode === "view") return;
    const draftKey = getDraftKey();
    if (draftKey) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          headerData,
          gridData,
          productsList,
          timestamp: new Date().getTime(),
        }),
      );
    }
  }, [headerData, gridData, productsList, currentMode]);

  const clearDraft = () => {
    const draftKey = getDraftKey();
    if (draftKey) sessionStorage.removeItem(draftKey);
  };

  const loadLocations = async (warehouseId: number) => {
    if (!warehouseId) return;
    try {
      const res = await inventoryService.getLocations(warehouseId);
      const locs = Array.isArray(res) ? res : res?.items || [];
      setLocations(locs);
    } catch (error) {
      console.error(error);
      toast.error("خطا در دریافت لیست قفسه‌بندی");
    }
  };

  useEffect(() => {
    if (isInitialized.current && headerData.warehouseId)
      loadLocations(Number(headerData.warehouseId));
    if (isInitialized.current && !headerData.warehouseId) setLocations([]);
  }, [headerData.warehouseId]);

  const reloadDocument = async () => {
    if (!docData?.id) return;
    setIsReloading(true);
    try {
      const freshDoc = await inventoryService.getDocById(docData.id);
      setDocData(freshDoc);
      sessionStorage.removeItem(`inventory-doc-draft-${docData.id}`);
    } catch (error) {
      handleApiError(error, "خطا در بازخوانی اطلاعات.");
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
    { key: "code", label: "کد", width: "80px" },
    { key: "name", label: "نام", width: "200px" },
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

  // === Handlers ===
  const handleSave = async () => {
    // 1. بررسی هدر
    if (!headerData.docTypeId || !headerData.warehouseId) {
      return toast.error("لطفا نوع سند و انبار را انتخاب کنید.");
    }

    // 2. پاکسازی و فیلتر کردن گرید (Sanitization)
    // فقط ردیف‌هایی را نگه دار که "کالا" (productId) داشته باشند
    const validDetails = gridData.filter(
      (row) => row.productId && Number(row.productId) > 0,
    );

    // 3. چک کردن اینکه آیا بعد از فیلتر، چیزی باقی مانده؟
    if (validDetails.length === 0) {
      return toast.error("لطفا حداقل یک قلم کالا وارد کنید.");
    }

    // 4. بررسی مقادیر اجباری در ردیف‌های معتبر
    const invalidRow = validDetails.find(
      (r) => !r.mainUnitQuantity || Number(r.mainUnitQuantity) <= 0,
    );
    if (invalidRow) {
      return toast.error("تعداد کالا در تمام ردیف‌ها باید بزرگتر از صفر باشد.");
    }

    setSubmitting(true);
    try {
      // مپ کردن و تبدیل تایپ‌ها (جلوگیری از خطای JSON)
      const detailsDto = validDetails.map((row) => ({
        id: row.id || null,
        productId: Number(row.productId),
        mainUnitQuantity: Number(row.mainUnitQuantity),
        subUnitQuantity: 0,
        // ✅ اصلاح مهم: تبدیل رشته خالی یا undefined به null برای جلوگیری از خطای 400
        locationId: row.locationId ? Number(row.locationId) : null,
        batchId: null,
        description: row.description || "",
      }));

      if (currentMode === "create") {
        const command: CreateInventoryDocCommand = {
          ...headerData,
          details: detailsDto,
        };
        const result: any = await inventoryService.createDoc(command);
        const newId =
          typeof result === "object" && result !== null
            ? result.id || result.data || result
            : result;

        toast.success("سند جدید ایجاد شد");
        clearDraft();
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
        clearDraft();
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
      clearDraft();
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
      clearDraft();
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
      clearDraft();
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
        {/* ✅ دکمه عملیات با استایل جدید */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-slate-600 hover:text-slate-900 border-slate-300"
        >
          <MoreVertical className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">عملیات</span>
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
        {currentMode === "edit" && !isReadOnly && (
          <DropdownMenuItem
            onClick={handleSave}
            disabled={submitting}
            className="sm:hidden"
          >
            <Save className="w-4 h-4 ml-2" />
            ذخیره تغییرات
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
        currentMode === "create"
          ? "ثبت سند جدید"
          : `سند انبار شماره ${docData?.docNumber || "..."}`
      }
      headerActions={
        <div className="flex items-center gap-2">
          {currentMode !== "create" && (
            <div className="hidden sm:flex items-center ml-2">
              <Badge
                variant="outline"
                className={`gap-1.5 px-2.5 py-0.5 rounded-full ${statusInfo?.className}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo?.label}
              </Badge>
            </div>
          )}

          {/* دکمه انصراف / بازگشت */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 w-8 px-0 sm:w-auto sm:px-3 text-slate-600 hover:bg-slate-100"
          >
            <ArrowRight className="w-4 h-4 sm:ml-1.5" />
            <span className="hidden sm:inline text-xs">بازگشت</span>
          </Button>

          <div className="flex items-center gap-2">
            {/* 1. دکمه ذخیره تغییرات (Edit Mode) */}
            {currentStatus === InventoryDocStatus.Draft &&
              currentMode === "edit" && (
                <Button
                  onClick={handleSave}
                  disabled={submitting}
                  size="sm"
                  className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">
                    ذخیره تغییرات
                  </span>
                </Button>
              )}

            {/* 2. دکمه قطعی سازی (Approved Mode) */}
            {currentStatus === InventoryDocStatus.Approved &&
              currentMode === "edit" && (
                <Button
                  onClick={handlePost}
                  disabled={submitting}
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">قطعی سازی</span>
                </Button>
              )}
          </div>

          {/* منوی عملیات */}
          {currentMode !== "create" && <ActionMenu />}

          {/* 3. دکمه ثبت سند (Create Mode) */}
          {currentMode === "create" && (
            <Button
              onClick={handleSave}
              disabled={submitting}
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">ثبت سند</span>
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
              setHeaderData((prev: any) => ({ ...prev, [name]: val }))
            }
          />
        </div>
      }
      tabs={[
        {
          key: "items",
          label: `اقلام سند (${gridData.length})`,
          content: (
            <div className="h-full border rounded-lg bg-card shadow-sm overflow-hidden relative">
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
