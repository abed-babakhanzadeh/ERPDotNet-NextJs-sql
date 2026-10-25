"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Save,
  Printer,
  ArrowRight,
  MoreVertical,
  Loader2,
  Pencil,
  Send,
  CalendarClock,
} from "lucide-react";

import MasterDetailForm from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import AdvancedEditableGrid, {
  GridColumn,
} from "@/components/grid/AdvancedEditableGrid";
import { Button } from "@/components/ui/button";
import { InventoryDocStatusBadge } from "@/components/inventory/InventoryDocStatusBadge";
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
  InventoryBatchDto,
  InventoryDocDto,
  InventoryDocStatus,
  InventoryNature,
} from "@/types/inventory";
import { useConfirm } from "@/providers/ConfirmProvider";
import {
  EMPTY_DOC,
  firstDocError,
  hasProduct,
  makeDocSchema,
  parseSerials,
  type DocFormValues,
  type DocRow,
} from "./docFormSchema";

interface DocFormProps {
  mode: "create" | "edit" | "view";
  initialData?: InventoryDocDto;
  docTypes: any[];
  warehouses: any[];
}

// 🌟 وضعیت‌ها بر اساس Enum جدید سیستم گردش کار
export default function DocForm({
  mode: initialMode,
  initialData: serverInitialData,
  docTypes,
  warehouses,
}: DocFormProps) {
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();

  const [docData, setDocData] = useState<InventoryDocDto | undefined>(
    serverInitialData,
  );
  const [currentMode, setCurrentMode] = useState(initialMode);

  const [submitting, setSubmitting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const [locations, setLocations] = useState<any[]>([]);
  // لوکیشن‌های انبار مقصد (فقط سند انتقال)
  const [destinationLocations, setDestinationLocations] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  // بچ‌های تعریف‌شده هر کالا (از تب «بچ‌ها» در فرم کالا)
  const [batchesByProduct, setBatchesByProduct] = useState<Record<number, InventoryBatchDto[]>>({});
  const requestedBatches = useRef(new Set<number>());
  // کالاهای سریال‌دار (از تنظیمات انبار کالا)؛ ستون سریال فقط برای آن‌ها لازم است
  const [serialManaged, setSerialManaged] = useState<Record<number, boolean>>({});
  const [batchManaged, setBatchManaged] = useState<Record<number, boolean>>({});
  const [allocating, setAllocating] = useState(false);

  const isInitialized = useRef(false);
  // نسخه state همان پرچم؛ تا هشدار «تغییرات ذخیره‌نشده» پیش از پر شدن فرم نیاید
  const [initialized, setInitialized] = useState(false);

  const isTransferType = useCallback(
    (docTypeId: number | null) =>
      docTypes.find((dt) => dt.id === Number(docTypeId))?.natureValue ===
      InventoryNature.Transfer,
    [docTypes],
  );
  const schema = useMemo(
    () =>
      makeDocSchema({
        isTransfer: isTransferType,
        // بک‌اند قفسه را فقط هنگام ایجاد سند اجباری می‌داند
        requireLocation: initialMode === "create",
        isSerialManaged: (productId) => !!serialManaged[productId],
      }),
    [isTransferType, initialMode, serialManaged],
  );
  const form = useForm<DocFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_DOC,
  });
  const watched = useWatch({ control: form.control });
  // سربرگ و سطرها از همان state فرم خوانده می‌شوند تا AutoForm و جدول بدون تغییر بمانند
  const headerData = watched as DocFormValues;
  const gridData = (watched.details ?? []) as DocRow[];
  const headerErrors = Object.fromEntries(
    Object.entries(form.formState.errors)
      .filter(([key]) => key !== "details")
      .map(([key, err]) => [key, (err as { message?: string })?.message]),
  ) as Record<string, string | undefined>;

  const setHeaderField = (name: string, value: unknown) => {
    form.setValue(name as keyof DocFormValues, value as never, { shouldDirty: true });
    form.clearErrors(name as keyof DocFormValues);
  };
  const setGridData = (rows: DocRow[]) => {
    form.setValue("details", rows, { shouldDirty: true });
    form.clearErrors("details");
  };

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

      // مبنای «تغییرات ذخیره‌نشده» همیشه نسخه سرور (یا فرم خالی) است؛ پیش‌نویس روی آن اعمال می‌شود
      const base: DocFormValues = docData
        ? {
            docTypeId: docData.docTypeId,
            warehouseId: docData.warehouseId,
            destinationWarehouseId: docData.destinationWarehouseId ?? null,
            docDate: docData.docDate ? new Date(docData.docDate) : new Date(),
            description: docData.description || "",
            targetPartyName: docData.targetPartyName || "",
            referenceExternalCode: docData.referenceExternalCode || "",
            details:
              docData.details.map((d) => ({
                ...d,
                tempId: d.id,
                serialNumbers: (d.serialNumbers ?? []).join("، "),
              })) || [],
          }
        : { ...EMPTY_DOC, docDate: new Date() };
      form.reset(base);

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          form.reset({ ...base, ...parsed.headerData, details: parsed.gridData ?? [] }, { keepDefaultValues: true });
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
        }
      }
      isInitialized.current = true;
      setInitialized(true);
    };
    initData();
    // فقط با رسیدن نسخه تازه سند دوباره مقداردهی شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docData, initialMode]);

  useEffect(() => {
    if (!isInitialized.current || currentMode === "view") return;
    const draftKey = getDraftKey();
    if (draftKey) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          // همان قالب قبلی تا پیش‌نویس‌های باز کاربران هم خوانده شوند
          headerData: { ...headerData, details: undefined },
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

  // بچ مسدود هم آورده می‌شود تا سطری که قبلاً به آن اشاره کرده خالی نماند؛ قطعی کردن سند آن را رد می‌کند
  useEffect(() => {
    const missing = Array.from(
      new Set(gridData.map((r) => Number(r.productId)).filter((id) => id > 0)),
    ).filter((id) => !requestedBatches.current.has(id));
    missing.forEach(async (productId) => {
      requestedBatches.current.add(productId);
      try {
        const [batches, profile] = await Promise.all([
          inventoryService.getProductBatches(productId, true),
          inventoryService.getProductProfile(productId).catch(() => null),
        ]);
        setBatchesByProduct((prev) => ({ ...prev, [productId]: batches }));
        setSerialManaged((prev) => ({ ...prev, [productId]: !!profile?.isSerialManaged }));
        setBatchManaged((prev) => ({ ...prev, [productId]: !!profile?.isBatchManaged }));
      } catch {
        requestedBatches.current.delete(productId);
      }
    });
  }, [gridData]);

  const loadLocations = async (warehouseId: number) => {
    if (!warehouseId) return;
    try {
      const res = await inventoryService.getLocations(warehouseId);
      const locs = Array.isArray(res) ? res : res?.items || [];
      setLocations(locs);
    } catch (error) {
      handleApiError(error, "خطا در دریافت لیست قفسه‌بندی");
    }
  };

  useEffect(() => {
    if (isInitialized.current && headerData.warehouseId)
      loadLocations(Number(headerData.warehouseId));
    if (isInitialized.current && !headerData.warehouseId) setLocations([]);
  }, [headerData.warehouseId]);

  useEffect(() => {
    const destinationId = Number(headerData.destinationWarehouseId);
    if (!destinationId) {
      setDestinationLocations([]);
      return;
    }
    inventoryService
      .getLocations(destinationId)
      .then((res) =>
        setDestinationLocations(Array.isArray(res) ? res : res?.items || []),
      )
      .catch(() => toast.error("خطا در دریافت قفسه‌های انبار مقصد"));
  }, [headerData.destinationWarehouseId]);

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
        filters: [],
      });
      if (response?.items) setProductsList(response.items);
    } catch (error) {
      handleApiError(error, "خطا در جستجوی کالا");
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

  // 🌟 وضعیت فعلی و تشخیص اینکه فرم قابل ویرایش است یا خیر
  const currentStatus = docData?.status || InventoryDocStatus.Draft;
  const isEditableStatus =
    currentStatus === InventoryDocStatus.Draft ||
    currentStatus === InventoryDocStatus.RequiresRevision;
  const isReadOnly = currentMode === "view" || !isEditableStatus;

  const isDirty =
    form.formState.isDirty && initialized && !isReadOnly && !isReloading;


  const isTransfer = isTransferType(headerData.docTypeId ?? null);
  const nature = docTypes.find((dt) => dt.id === Number(headerData.docTypeId))?.natureValue;
  const isOutgoing = nature === InventoryNature.Output || nature === InventoryNature.Transfer;
  // سطرهای خروجی کالای بچ‌دار که هنوز بچ ندارند
  const needsBatch = (row: DocRow) =>
    batchManaged[Number(row.productId)] && !row.batchId && Number(row.mainUnitQuantity) > 0;
  const canAllocateFefo = isOutgoing && !isReadOnly && gridData.some(needsBatch);

  // هر سطر به یک یا چند سطر با بچ و قفسه پیشنهادی (زودترین انقضا اول) شکسته می‌شود
  const handleFefo = async () => {
    if (!headerData.warehouseId) {
      toast.error("ابتدا انبار را انتخاب کنید");
      return;
    }
    setAllocating(true);
    try {
      const shortages: string[] = [];
      const next: DocRow[] = [];
      for (const row of gridData) {
        if (!needsBatch(row)) {
          next.push(row);
          continue;
        }
        const res = await inventoryService.suggestFefo({
          productId: Number(row.productId),
          warehouseId: Number(headerData.warehouseId),
          quantity: Number(row.mainUnitQuantity),
          asOfDate: headerData.docDate ? new Date(headerData.docDate).toISOString() : undefined,
        });
        if (res.shortage > 0) shortages.push(`${row.productName || row.productCode}: ${res.shortage}`);
        if (res.lines.length === 0) {
          next.push(row);
          continue;
        }
        res.lines.forEach((l, i) =>
          next.push({
            ...row,
            id: i === 0 ? row.id : null,
            tempId: i === 0 ? row.tempId : undefined,
            mainUnitQuantity: l.quantity,
            batchId: l.batchId,
            batchNumber: l.batchNumber,
            locationId: l.locationId ?? row.locationId,
          }),
        );
        // کسری روی سطر جداگانه بدون بچ می‌ماند تا کاربر تصمیم بگیرد
        if (res.shortage > 0)
          next.push({ ...row, id: null, tempId: undefined, mainUnitQuantity: res.shortage, batchId: null });
      }
      setGridData(next);
      if (shortages.length)
        toast.warning(`موجودی بچ‌های قابل خروج کافی نیست (${shortages.join("، ")})`);
      else toast.success("بچ‌ها به روش FEFO تخصیص داده شدند");
    } catch (error) {
      handleApiError(error, "خطا در پیشنهاد بچ");
    } finally {
      setAllocating(false);
    }
  };

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
    // انبار مقصد فقط برای سند انتقال معنا دارد
    ...(isTransfer
      ? [
          {
            name: "destinationWarehouseId",
            label: "انبار مقصد",
            type: "select",
            options: warehouses
              .filter((w) => w.id !== Number(headerData.warehouseId))
              .map((w) => ({ label: w.title, value: w.id })),
            required: true,
            colSpan: 1,
            disabled: isReadOnly,
          } satisfies FieldConfig,
        ]
      : []),
    {
      name: "description",
      label: "توضیحات",
      type: "textarea",
      colSpan: 3,
      disabled: isReadOnly,
    },
  ];

  const hasSerialRows = gridData.some((r) => serialManaged[Number(r.productId)]);

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
                  // بچ به کالا تعلق دارد؛ با عوض شدن کالا پاک می‌شود
                  batchId: item.id === row.productId ? row.batchId : null,
                  batchNumber: item.id === row.productId ? row.batchNumber : undefined,
                });
              else onValueChange(null);
            }}
            items={productsList}
            columns={productLookupColumns}
            loading={productsLoading}
            onSearch={handleProductSearch}
            placeholder="کد یا نام کالا..."
            ariaLabel={`کالا ردیف ${index + 1}`}
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
      // ردیابی کامل انتقال: قفسه مقصد برای هر سطر
      ...(isTransfer
        ? [
            {
              key: "destinationLocationId",
              title: "قفسه مقصد",
              type: "select" as const,
              width: "150px",
              required: true,
              options: destinationLocations.map((l) => ({
                label: l.title,
                value: l.id,
              })),
              disabled: isReadOnly,
            },
          ]
        : []),
      {
        key: "batchId",
        title: "بچ",
        type: "select",
        width: "150px",
        getOptions: (row: DocRow) =>
          (batchesByProduct[Number(row.productId)] ?? []).map((b) => ({
            label: b.isBlocked ? `${b.batchNumber} (مسدود)` : b.batchNumber,
            value: b.id,
          })),
        disabled: isReadOnly,
      },
      // فقط وقتی کالای سریال‌داری در سند هست
      ...(hasSerialRows
        ? [
            {
              key: "serialNumbers",
              title: "شماره سریال‌ها",
              type: "text" as const,
              width: "240px",
              placeholder: "با کاما جدا کنید",
              disabled: isReadOnly,
            },
          ]
        : []),
      {
        key: "description",
        title: "توضیحات ردیف",
        type: "text",
        width: "200px",
        disabled: isReadOnly,
      },
    ],
    [
      locations,
      destinationLocations,
      isTransfer,
      productsList,
      productsLoading,
      isReadOnly,
      batchesByProduct,
      hasSerialRows,
    ],
  );

  // === Handlers ===
  const onInvalid = (errors: FieldErrors<DocFormValues>) => {
    const message = firstDocError(errors as Record<string, unknown>);
    if (message) toast.error(message);
  };

  const onValid = async (values: DocFormValues) => {
    const validDetails = values.details.filter(hasProduct);

    setSubmitting(true);
    try {
      const detailsDto = validDetails.map((row) => ({
        id: row.id || null,
        productId: Number(row.productId),
        mainUnitQuantity: Number(row.mainUnitQuantity),
        subUnitQuantity: 0,
        locationId: row.locationId ? Number(row.locationId) : null,
        destinationLocationId:
          isTransfer && row.destinationLocationId
            ? Number(row.destinationLocationId)
            : null,
        batchId: row.batchId ? Number(row.batchId) : null,
        serialNumbers: serialManaged[Number(row.productId)] ? parseSerials(row.serialNumbers) : [],
        description: row.description || "",
      }));

      if (currentMode === "create") {
        const command = {
          docTypeId: values.docTypeId,
          warehouseId: values.warehouseId,
          destinationWarehouseId: values.destinationWarehouseId,
          docDate: values.docDate,
          targetPartyName: values.targetPartyName,
          referenceExternalCode: values.referenceExternalCode,
          description: values.description,
          details: detailsDto,
        } as unknown as CreateInventoryDocCommand;
        const result: any = await inventoryService.createDoc(command);
        const newId =
          typeof result === "object" && result !== null
            ? result.id || result.data || result
            : result;

        toast.success("سند پیش‌نویس با موفقیت ایجاد شد");
        clearDraft();
        // مبنا همان مقدار ثبت‌شده می‌شود تا رفتن به صفحه ویرایش هشدار تغییرات ندهد
        form.reset(values);
        router.push(`/inventory/docs/edit/${newId}`);
      } else {
        if (!docData) return;
        const command = {
          id: docData.id,
          docDate: values.docDate,
          description: values.description,
          warehouseId: values.warehouseId,
          destinationWarehouseId: isTransfer
            ? values.destinationWarehouseId
            : null,
          rowVersion: docData.rowVersion,
          details: detailsDto,
        } as unknown as UpdateInventoryDocCommand;
        await inventoryService.updateDoc(docData.id, command);
        toast.success("تغییرات با موفقیت ذخیره شد");
        clearDraft();
        await reloadDocument();
      }
    } catch (error: any) {
      handleApiError(error, "خطا در ذخیره سازی");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = form.handleSubmit(onValid, onInvalid);

  // 🌟 هندلر جدید برای ارسال به گردش کار
  const handleSubmitToWorkflow = async () => {
    if (!docData?.id) return;
    if (
      !(await confirm({ title: "آیا از ارسال این سند برای بررسی و تایید نهایی اطمینان دارید؟", confirmText: "ارسال" }))
    )
      return;

    setSubmitting(true);
    try {
      await inventoryService.submitDoc(docData.id);
      // خط پیام موفقیت (Toast)
      toast.success("سند با موفقیت جهت بررسی ارسال شد");
      clearDraft();

      // هدایت کاربر به صفحه لیست اسناد پس از ارسال موفق
      router.push("/inventory/docs");
    } catch (error: any) {
      handleApiError(error, "خطا در ارسال به گردش کار");
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
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground border-border"
        >
          <MoreVertical className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only text-xs">عملیات</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>اقدامات سند</DropdownMenuLabel>

        {currentMode === "view" && isEditableStatus && (
          <DropdownMenuItem
            onClick={handleSwitchToEdit}
            className="cursor-pointer"
          >
            <Pencil className="w-4 h-4 ml-2 text-primary" />
            ویرایش سند
          </DropdownMenuItem>
        )}

        {currentMode === "edit" && !isReadOnly && (
          <DropdownMenuItem
            onClick={handleSave}
            disabled={submitting}
            className="sm:hidden cursor-pointer"
          >
            <Save className="w-4 h-4 ml-2" />
            ذخیره تغییرات
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => window.print()}
          className="cursor-pointer"
        >
          <Printer className="w-4 h-4 ml-2 text-muted-foreground" />
          چاپ سند
        </DropdownMenuItem>

        {isEditableStatus && currentMode === "edit" && docData?.id && (
          <>
            <DropdownMenuSeparator />
            <PermissionGuard permission="Inventory.Docs.Edit">
              <DropdownMenuItem
                onClick={handleSubmitToWorkflow}
                disabled={submitting}
                className="text-primary font-bold bg-primary/10 focus:bg-primary/15 cursor-pointer"
              >
                <Send className="w-4 h-4 ml-2" />
                تایید و ارسال
              </DropdownMenuItem>
            </PermissionGuard>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MasterDetailForm
      title={
        currentMode === "create"
          ? "ثبت سند جدید (پیش‌نویس)"
          : `سند انبار شماره ${docData?.docNumber || "..."}`
      }
      headerActions={
        <div className="flex items-center gap-2">
          {currentMode !== "create" && (
            <div className="hidden sm:flex items-center ml-2">
              <InventoryDocStatusBadge status={currentStatus} />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 w-8 px-0 sm:w-auto sm:px-3 text-muted-foreground hover:bg-muted"
          >
            <ArrowRight className="w-4 h-4 sm:ml-1.5" />
            <span className="sr-only sm:not-sr-only text-xs">بازگشت</span>
          </Button>

          <div className="flex items-center gap-2">
            {/* دکمه ذخیره تغییرات */}
            {/* دکمه ذخیره تغییرات */}
            {isEditableStatus && currentMode === "edit" && (
              <Button
                onClick={handleSave}
                disabled={submitting}
                size="sm"
                className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                <span className="sr-only sm:not-sr-only text-xs">ذخیره تغییرات</span>
              </Button>
            )}

            {/* 🌟 دکمه استارت گردش کار (نمایش مستقیم در هدر برای دسترسی سریع‌تر) */}
            {isEditableStatus && currentMode === "edit" && docData?.id && (
              <PermissionGuard permission="Inventory.Docs.Edit">
                <Button
                  onClick={handleSubmitToWorkflow}
                  disabled={submitting}
                  size="sm"
                  className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4" />
                  <span className="sr-only sm:not-sr-only text-xs">
                    تایید و ارسال
                  </span>
                </Button>
              </PermissionGuard>
            )}
          </div>

          {currentMode !== "create" && <ActionMenu />}

          {currentMode === "create" && (
            <Button
              onClick={handleSave}
              disabled={submitting}
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only text-xs">ثبت اولیه</span>
            </Button>
          )}
        </div>
      }
      submitting={submitting}
      isDirty={isDirty}
      headerContent={
        <div className="relative">
          {isReloading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <AutoForm
            fields={headerFields}
            data={headerData}
            errors={headerErrors}
            onChange={setHeaderField}
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
              {canAllocateFefo && (
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>برای سطرهای بدون بچ، بچ و قفسه از زودترین تاریخ انقضا پیشنهاد می‌شود.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFefo}
                    disabled={allocating}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {allocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
                    تخصیص بچ (FEFO)
                  </Button>
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
