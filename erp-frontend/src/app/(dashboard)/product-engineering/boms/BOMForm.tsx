"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Layers,
  FileText,
  Pencil,
  CopyPlus,
  Network,
  FileSearch,
  Recycle,
} from "lucide-react";

// Components
import MasterDetailForm from "@/components/form/MasterDetailForm";
import AutoForm, { FieldConfig } from "@/components/form/AutoForm";
import EditableGrid, { GridColumn } from "@/components/form/EditableGrid";
import {
  TableLookupCombobox,
  ColumnDef,
} from "@/components/ui/TableLookupCombobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SubstitutesDialog from "./SubstitutesDialog";
import BOMOutputsGrid from "./BOMOutputsGrid";
import {
  bomSchema,
  emptyBOM,
  firstBOMError,
  headerOf,
  type BOMFormValues,
  type BOMHeaderState,
  type BOMOutputRow,
  type BOMRow,
  type UnitOption,
} from "./bomFormSchema";

// Hooks & Providers
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";
import { useFormPersist } from "@/hooks/useFormPersist";
import { handleApiError } from "@/lib/error-handling";
import { productService } from "@/services/baseInfoService";
import { bomService } from "@/services/bomService";
import type { BOMListDto } from "@/types/api";

// Types
type FormMode = "create" | "edit" | "view";

interface BOMFormProps {
  mode: FormMode;
  bomId?: number;
}

interface ProductLookupDto {
  id: number;
  code: string;
  name: string;
  unitName: string;
}

type BOMLookupDto = BOMListDto;

export default function BOMForm({ mode, bomId }: BOMFormProps) {
  const { closeTab, activeTabId, addTab } = useTabs();
  const { hasPermission } = usePermissions();

  const isReadOnly = mode === "view";
  const canEdit = hasPermission("ProductEngineering.BOM.Create");

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingVersion, setFetchingVersion] = useState(false);

  // سربرگ و سطرها در یک فرم react-hook-form؛ مبنای «تغییرات ذخیره‌نشده» مقدار reset شده است
  const form = useForm<BOMFormValues>({
    resolver: zodResolver(bomSchema),
    defaultValues: emptyBOM(),
  });
  const watched = useWatch({ control: form.control }) as BOMFormValues;
  const details = watched.details ?? [];
  const outputs = watched.outputs ?? [];
  const headerData = useMemo(() => headerOf(watched), [watched]);
  const headerErrors = Object.fromEntries(
    Object.entries(form.formState.errors)
      .filter(([key]) => key !== "details" && key !== "outputs")
      .map(([key, err]) => [key, (err as { message?: string })?.message]),
  ) as Record<string, string | undefined>;

  // به‌روزرسانی‌ها همیشه روی مقدار فعلی فرم انجام می‌شوند (نه مقدار زمان رندر)،
  // تا پاسخ دیر سرور مقداری را که کاربر در این فاصله وارد کرده پاک نکند
  const setDetails: React.Dispatch<React.SetStateAction<BOMRow[]>> = (next) => {
    const rows = typeof next === "function" ? next(form.getValues("details")) : next;
    form.setValue("details", rows, { shouldDirty: true });
    form.clearErrors("details");
  };
  const setOutputs: React.Dispatch<React.SetStateAction<BOMOutputRow[]>> = (next) => {
    const rows = typeof next === "function" ? next(form.getValues("outputs")) : next;
    form.setValue("outputs", rows, { shouldDirty: true });
    form.clearErrors("outputs");
  };
  const setHeaderData: React.Dispatch<React.SetStateAction<BOMHeaderState>> = (next) => {
    const prev = headerOf(form.getValues());
    const header = typeof next === "function" ? next(prev) : next;
    (Object.keys(header) as (keyof BOMHeaderState)[]).forEach((key) => {
      if (header[key] === prev[key]) return;
      form.setValue(key, header[key] as never, { shouldDirty: true });
      form.clearErrors(key);
    });
  };

  const [loaded, setLoaded] = useState(mode === "create");
  const isDirty = form.formState.isDirty && !isReadOnly && loaded && !loadingData;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<BOMLookupDto[]>([]);

  const [headerProductOptions, setHeaderProductOptions] = useState<
    ProductLookupDto[]
  >([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [gridProductOptions, setGridProductOptions] = useState<
    ProductLookupDto[]
  >([]);
  const [gridLoading, setGridLoading] = useState(false);

  const persistKey = `temp-bom-${mode}-${bomId || "new"}`;

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && bomId) {
      loadBOMData(bomId);
    }
  }, [mode, bomId]);

  // افکت جدید: دریافت ورژن بعدی هنگام انتخاب کالا (فقط در حالت ایجاد)
  useEffect(() => {
    if (mode === "create" && headerData.productId) {
      const fetchNext = async () => {
        setFetchingVersion(true);
        try {
          const nextVersion = await bomService.getNextVersion(Number(headerData.productId));
          form.setValue("version", nextVersion, { shouldDirty: true });
        } catch (error) {
          console.error("Error fetching next version:", error);
        } finally {
          setFetchingVersion(false);
        }
      };
      fetchNext();
    }
  }, [headerData.productId, mode, form]);

  const safeCloseTab = () => {
    setTimeout(() => {
      closeTab(activeTabId);
    }, 0);
  };

  const fetchProductUnits = async (
    productId: number
  ): Promise<UnitOption[]> => {
    try {
      const data = await productService.getById(productId);
      const options: UnitOption[] = [];

      if (data.unitId) {
        options.push({
          value: data.unitId,
          label: data.unitName || "واحد اصلی",
          factor: 1,
        });
      }
      if (data.conversions) {
        data.conversions.forEach((c: any) => {
          options.push({
            value: c.alternativeUnitId,
            label: c.alternativeUnitName,
            factor: c.factor,
          });
        });
      }
      return options;
    } catch (error) {
      console.warn(`Error fetching units for product ${productId}`, error);
      return [];
    }
  };

  const loadBOMData = async (id: number) => {
    if (isNaN(id)) return;

    setLoadingData(true);
    try {
      const data = await bomService.getById(id);

      const header: BOMHeaderState = {
        productId: data.productId,
        productName: data.productName,
        title: data.title || "",
        version: data.version, // سرور عدد برمی‌گرداند
        usage: data.usageId || 1, // سرور usageId برمی‌گرداند
        type: data.typeId,
        fromDate: data.fromDate
          ? data.fromDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        toDate: data.toDate ? data.toDate.split("T")[0] : undefined,
        isActive: data.isActive ?? true,
        baseQuantity: data.baseQuantity ?? 1,
      };

      const initialProductOption = {
        id: data.productId,
        code: data.productCode,
        name: data.productName,
        unitName: data.unitName,
      };

      setHeaderProductOptions([initialProductOption as any]);

      const mappedDetails = await Promise.all(
        data.details.map(async (d: any) => {
          const units = await fetchProductUnits(d.childProductId);

          return {
            id: Math.random().toString(36).substr(2, 9),
            childProductId: d.childProductId,
            childProductName: d.childProductName,
            childProductCode: d.childProductCode,

            quantity: d.quantity,
            baseUnitId: d.unitId,
            unitName: d.unitName,

            inputQuantity: d.inputQuantity || d.quantity,
            inputUnitId: d.inputUnitId || d.unitId,

            unitOptions:
              units.length > 0
                ? units
                : [{ value: d.unitId, label: d.unitName, factor: 1 }],

            wastePercentage: d.wastePercentage,
            substitutes: d.substitutes
              ? d.substitutes.map((s: any) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  substituteProductId: s.substituteProductId,
                  productName: s.substituteProductName,
                  productCode: s.substituteProductCode,
                  priority: s.priority,
                  factor: s.factor,
                  isMixAllowed: s.isMixAllowed ?? false,
                  maxMixPercentage: s.maxMixPercentage ?? 0,
                  note: s.note ?? "",
                }))
              : [],
          };
        })
      );

      const mappedOutputs: BOMOutputRow[] = (data.outputs ?? []).map((o) => ({
        id: Math.random().toString(36).slice(2, 11),
        productId: o.productId,
        productCode: o.productCode,
        productName: o.productName,
        unitName: o.unitName,
        type: o.typeId,
        quantity: o.quantity,
        costSharePercent: o.costSharePercent,
      }));

      form.reset({ ...header, details: mappedDetails, outputs: mappedOutputs });
      setLoaded(true);
    } catch (error) {
      handleApiError(error, "خطا در دریافت اطلاعات BOM");
      safeCloseTab();
    } finally {
      setLoadingData(false);
    }
  };

  const mapTemplateToRows = async (serverDetails: any[]): Promise<BOMRow[]> => {
    return await Promise.all(
      serverDetails.map(async (d: any) => {
        const units = await fetchProductUnits(d.childProductId);
        return {
          id: Math.random().toString(36).substr(2, 9),
          childProductId: d.childProductId,
          childProductName: d.childProductName,
          childProductCode: d.childProductCode,
          quantity: d.quantity,
          baseUnitId: d.unitId || units[0]?.value,
          unitName: d.unitName || units[0]?.label,
          inputQuantity: d.inputQuantity || d.quantity,
          inputUnitId: d.inputUnitId || d.unitId || units[0]?.value,
          unitOptions: units,
          wastePercentage: d.wastePercentage,
          substitutes: d.substitutes
            ? d.substitutes.map((s: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                substituteProductId: s.substituteProductId,
                productName: s.substituteProductName,
                productCode: s.substituteProductCode,
                priority: s.priority,
                factor: s.factor,
                isMixAllowed: s.isMixAllowed ?? false,
                maxMixPercentage: s.maxMixPercentage ?? 0,
                note: s.note ?? "",
              }))
            : [],
        };
      })
    );
  };

  const searchProductsApi = async (term: string) => {
    if (!term && mode === "create") return [];
    const res = await productService.search({
      pageNumber: 1,
      pageSize: 20,
      searchTerm: term,
    });
    return res.items;
  };

  const onSearchHeader = async (term: string) => {
    setHeaderLoading(true);
    try {
      const items = await searchProductsApi(term);
      setHeaderProductOptions(items);
    } finally {
      setHeaderLoading(false);
    }
  };

  const onSearchGrid = async (term: string) => {
    setGridLoading(true);
    try {
      const items = await searchProductsApi(term);
      setGridProductOptions(items);
    } finally {
      setGridLoading(false);
    }
  };

  const onSearchTemplate = async (term: string) => {
    setTemplateLoading(true);
    try {
      const res = await bomService.search({
        pageNumber: 1,
        pageSize: 20,
        searchTerm: term,
      });
      setTemplateOptions(res.items);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportTemplate = async (sourceBomId: number) => {
    setTemplateLoading(true);
    try {
      const data = await bomService.getById(sourceBomId);

      if (data.details && data.details.length > 0) {
        const newRows = await mapTemplateToRows(data.details);
        setDetails(newRows);
        toast.success(`${newRows.length} ردیف با موفقیت فراخوانی شد.`);
        setTemplateDialogOpen(false);
      } else {
        toast.warning("BOM انتخاب شده هیچ ردیفی ندارد.");
      }
    } catch (error) {
      handleApiError(error, "خطا در فراخوانی الگو");
    } finally {
      setTemplateLoading(false);
    }
  };

  const productLookupColumns: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "کد کالا/قلم", width: "30%" },
      { key: "name", label: "نام کالا/قلم", width: "50%" },
      { key: "unitName", label: "واحد", width: "20%" },
    ],
    []
  );

  const headerFields: FieldConfig[] = useMemo(
    () => [
      {
        name: "isActive",
        label: "فرمول فعال است",
        type: "checkbox",
        disabled: isReadOnly,
        colSpan: 1,
      },
      {
        name: "version",
        label: "شماره نسخه",
        type: "number", // ورودی عددی شد
        required: true,
        disabled: isReadOnly || fetchingVersion, // هنگام دریافت از سرور غیرفعال شود
        colSpan: 1,
      },
      {
        name: "usage", // فیلد جدید کاربرد
        label: "کاربرد فرمول",
        type: "select",
        required: true,
        disabled: isReadOnly,
        options: [
          { label: "فرمول اصلی (Main)", value: 1 },
          { label: "فرمول جایگزین (Alternate)", value: 2 },
        ],
        colSpan: 1,
      },
      {
        name: "baseQuantity",
        label: "مقدار پایه (اقلام برای این مقدار)",
        type: "number",
        required: true,
        disabled: isReadOnly,
        colSpan: 1,
      },
      {
        name: "type",
        label: "ماهیت",
        type: "select",
        required: true,
        disabled: isReadOnly,
        options: [
          { label: "ساخت (Manufacturing)", value: 1 },
          { label: "مهندسی (Engineering)", value: 2 },
          { label: "کیت فروش (Sales)", value: 3 },
        ],
        colSpan: 1,
      },
      {
        name: "title",
        label: "عنوان فرمول",
        type: "text",
        required: true,
        disabled: isReadOnly,
        colSpan: 2,
      },
      {
        name: "fromDate",
        label: "تاریخ اعتبار از",
        type: "date",
        required: true,
        disabled: isReadOnly,
        colSpan: 1,
      },
      {
        name: "toDate",
        label: "تا تاریخ (اختیاری)",
        type: "date",
        required: false,
        disabled: isReadOnly,
        colSpan: 1,
      },
    ],
    [isReadOnly, fetchingVersion]
  );

  const detailColumns: GridColumn<BOMRow>[] = useMemo(
    () => [
      {
        key: "childProductId",
        title: "ماده اولیه / قطعه",
        type: "select",
        width: "30%",
        required: true,
        disabled: isReadOnly,
        render: (row, index) => (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <TableLookupCombobox<ProductLookupDto>
                value={row.childProductId}
                items={gridProductOptions}
                loading={gridLoading}
                columns={productLookupColumns}
                searchableFields={["code", "name"]}
                displayFields={["code", "name"]}
                placeholder={row.childProductName || "جستجو..."}
                ariaLabel={`ماده اولیه ردیف ${index + 1}`}
                disabled={isReadOnly}
                onSearch={onSearchGrid}
                onOpenChange={(isOpen) => {
                  if (isOpen && gridProductOptions.length === 0)
                    onSearchGrid("");
                }}
                onValueChange={async (newId, item) => {
                  const productId = newId as number;
                  // کالا همان لحظه ثبت می‌شود؛ واحدها بعد از پاسخ سرور اضافه می‌شوند.
                  // به‌روزرسانی تابعی است تا مقداری که کاربر در این فاصله وارد کرده یا سطری که افزوده از دست نرود.
                  setDetails((prev) =>
                    prev.map((r, i) =>
                      i === index
                        ? {
                            ...r,
                            childProductId: productId,
                            childProductName: item?.name,
                            childProductCode: item?.code,
                            inputQuantity: 1,
                            quantity: 1,
                            substitutes: [],
                          }
                        : r,
                    ),
                  );
                  const units = await fetchProductUnits(productId);
                  const mainUnit = units[0];
                  if (!mainUnit) return;
                  setDetails((prev) =>
                    prev.map((r, i) =>
                      i === index && r.childProductId === productId
                        ? {
                            ...r,
                            baseUnitId: mainUnit.value,
                            unitName: mainUnit.label,
                            inputUnitId: mainUnit.value,
                            unitOptions: units,
                            // ضریب واحد اصلی ۱ است
                            quantity: r.inputQuantity,
                          }
                        : r,
                    ),
                  );
                }}
              />
            </div>

            {row.childProductId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                title="مشاهده موارد مصرف"
                onClick={(e) => {
                  e.stopPropagation();
                  addTab(
                    `مصرف: ${row.childProductName}`,
                    `/product-engineering/reports/where-used?productId=${
                      row.childProductId
                    }&productName=${row.childProductName}&productCode=${
                      row.childProductCode || ""
                    }`
                  );
                }}
              >
                <FileSearch className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
      },
      {
        key: "inputQuantity",
        title: "مقدار مصرفی",
        type: "number",
        width: "12%",
        required: true,
        disabled: isReadOnly,
        render: (row, index) => (
          <input
            type="number"
            aria-label={`مقدار مصرفی ردیف ${index + 1}`}
            className="w-full h-8 border rounded px-2 text-center focus:ring-2 focus:ring-primary/20 outline-none"
            value={row.inputQuantity}
            disabled={isReadOnly}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDetails((prev) =>
                prev.map((r, i) => {
                  if (i !== index) return r;
                  const factor =
                    r.unitOptions?.find((u) => u.value == r.inputUnitId)?.factor ?? 1;
                  return { ...r, inputQuantity: val, quantity: val * factor };
                }),
              );
            }}
          />
        ),
      },
      {
        key: "inputUnitId",
        title: "واحد مصرفی",
        type: "select",
        width: "12%",
        disabled: isReadOnly,
        render: (row, index) => (
          <select
            aria-label={`واحد مصرفی ردیف ${index + 1}`}
            className="w-full h-8 border rounded px-1 text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            value={row.inputUnitId}
            disabled={isReadOnly}
            onChange={(e) => {
              const newUnitId = Number(e.target.value);
              setDetails((prev) =>
                prev.map((r, i) => {
                  if (i !== index) return r;
                  const factor =
                    r.unitOptions?.find((u) => u.value == newUnitId)?.factor ?? 1;
                  return { ...r, inputUnitId: newUnitId, quantity: r.inputQuantity * factor };
                }),
              );
            }}
          >
            {row.unitOptions?.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
            {!row.unitOptions?.length && (
              <option value={row.baseUnitId}>{row.unitName}</option>
            )}
          </select>
        ),
      },
      {
        key: "quantity",
        title: "مقدار (پایه)",
        type: "readonly",
        width: "10%",
        render: (row) => (
          <div
            className="flex items-center justify-center gap-1 bg-muted/50 rounded h-8 px-2 text-xs font-mono text-muted-foreground"
            title={`معادل: ${row.quantity} ${row.unitName}`}
          >
            <span>{Number(row.quantity).toLocaleString()}</span>
            <span className="text-[10px]">{row.unitName}</span>
          </div>
        ),
      },
      {
        key: "wastePercentage",
        title: "ضایعات %",
        type: "number",
        width: "8%",
        disabled: isReadOnly,
      },
      {
        key: "substitutes",
        title: "جایگزین",
        type: "readonly",
        width: "8%",
        render: (row, index) => {
          const subCount = row.substitutes?.length || 0;
          return (
            <Button
              type="button"
              variant={subCount > 0 ? "default" : "outline"}
              size="sm"
              className={`h-7 text-xs gap-1 ${
                subCount > 0
                  ? "bg-success hover:bg-success/90"
                  : "text-muted-foreground border-dashed"
              }`}
              aria-label={`جایگزین‌های ردیف ${index + 1}${subCount > 0 ? ` (${subCount})` : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveRowIndex(index);
                setDialogOpen(true);
              }}
            >
              <Layers className="w-3 h-3" />
              {subCount > 0 ? `(${subCount})` : isReadOnly ? "ندارد" : "تعریف"}
            </Button>
          );
        },
      },
    ],
    [details, gridProductOptions, gridLoading, isReadOnly]
  );

  const formatDateToISO = (dateValue: string | undefined) => {
    if (!dateValue) return new Date().toISOString().split("T")[0];
    if (dateValue.includes("-") && dateValue.length === 10) return dateValue;
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  useFormPersist(
    `${persistKey}-header`,
    headerData,
    setHeaderData,
    mode !== "view"
  );

  useFormPersist(`${persistKey}-details`, details, setDetails, mode !== "view");
  useFormPersist(`${persistKey}-outputs`, outputs, setOutputs, mode !== "view");

  const onInvalid = (errors: FieldErrors<BOMFormValues>) => {
    toast.error(firstBOMError(errors) ?? "اطلاعات فرم کامل نیست.");
  };

  const onValid = async (values: BOMFormValues) => {
    const { details, outputs } = values;
    const headerData = values;
    setSubmitting(true);

    try {
      const safeFromDate = formatDateToISO(headerData.fromDate);
      const cleanToDate =
        headerData.toDate && headerData.toDate.trim() !== ""
          ? formatDateToISO(headerData.toDate)
          : null;

      const cleanDetails = details.map((d) => {
        const validSubstitutes = (d.substitutes || [])
          .filter(
            (s) => s.substituteProductId && Number(s.substituteProductId) > 0
          )
          .map((s) => ({
            substituteProductId: Number(s.substituteProductId),
            priority: Number(s.priority || 1),
            factor: Number(s.factor || 1),
            isMixAllowed: Boolean(s.isMixAllowed),
            maxMixPercentage: Number(s.maxMixPercentage || 0),
            note: s.note || null,
          }));

        return {
          childProductId: Number(d.childProductId),
          quantity: Number(d.quantity),
          inputQuantity: Number(d.inputQuantity || 0),
          inputUnitId: Number(d.inputUnitId) || d.baseUnitId || 0,
          wastePercentage: Number(d.wastePercentage || 0),
          substitutes: validSubstitutes,
        };
      });

      const payload: any = {
        title: headerData.title || "",
        version: Number(headerData.version), // به عدد تبدیل شد
        usage: Number(headerData.usage), // به عدد تبدیل شد
        type: Number(headerData.type) || 1,
        fromDate: safeFromDate,
        toDate: cleanToDate,
        isActive: headerData.isActive,
        baseQuantity: Number(headerData.baseQuantity),
        details: cleanDetails,
        outputs: outputs.map((o) => ({
          productId: Number(o.productId),
          type: Number(o.type),
          quantity: Number(o.quantity),
          costSharePercent: Number(o.costSharePercent || 0),
        })),
      };

      if (mode === "edit" && bomId) {
        payload.id = Number(bomId);
      }

      if (mode === "create") {
        payload.productId = Number(headerData.productId);
        await bomService.create(payload);
        toast.success("BOM با موفقیت ایجاد شد");
      } else if (mode === "edit" && bomId) {
        await bomService.update(Number(bomId), payload);
        toast.success("تغییرات با موفقیت ذخیره شد");
      }

      localStorage.removeItem(`${persistKey}-header`);
      localStorage.removeItem(`${persistKey}-details`);
      localStorage.removeItem(`${persistKey}-outputs`);
      // مقدار ثبت‌شده مبنای جدید است تا بستن تب هشدار تغییرات ذخیره‌نشده ندهد
      form.reset(values);

      safeCloseTab();
    } catch (error) {
      handleApiError(error, "خطا در ذخیره فرمول ساخت");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    return form.handleSubmit(onValid, onInvalid)(e);
  };

  const handleGoToEdit = () => {
    if (bomId) addTab(`ویرایش BOM`, `/product-engineering/boms/edit/${bomId}`);
  };

  const headerContent = (
    <div className="space-y-4 [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default [&_textarea:disabled]:cursor-default [&_input:disabled]:opacity-85 [&_select:disabled]:opacity-85 [&_textarea:disabled]:opacity-85">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-sm font-medium flex gap-1">
            کالا/قلم (محصول يا نيمه ساخته)
          </label>
          <TableLookupCombobox<ProductLookupDto>
            value={headerData.productId}
            items={headerProductOptions}
            loading={headerLoading}
            columns={productLookupColumns}
            onSearch={onSearchHeader}
            displayFields={["code", "name"]}
            disabled={isReadOnly || mode === "edit"}
            placeholder={headerData.productName || "جستجو..."}
            ariaLabel="کالا/قلم (محصول یا نیمه ساخته)"
            aria-invalid={!!headerErrors.productId}
            aria-describedby={headerErrors.productId ? "bom-product-error" : undefined}
            onValueChange={(val, item) => {
              setHeaderData((prev) => ({
                ...prev,
                productId: val as number,
                productName: item?.name,
              }));
            }}
          />
          {headerErrors.productId && (
            <p id="bom-product-error" className="text-[0.8rem] font-medium text-destructive">
              {headerErrors.productId}
            </p>
          )}
        </div>
      </div>
      <AutoForm
        fields={headerFields}
        data={headerData}
        errors={headerErrors}
        onChange={(name, val) =>
          setHeaderData((prev) => ({ ...prev, [name]: val }))
        }
        className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      />
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <MasterDetailForm
          title={
            mode === "create"
              ? "ایجاد BOM"
              : mode === "view"
              ? `مشاهده BOM: ${headerData.version}`
              : `ویرایش BOM: ${headerData.version}`
          }
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onCancel={isReadOnly ? undefined : safeCloseTab}
          formId="bom-form"
          submitting={submitting}
          isLoading={loadingData}
          isDirty={isDirty}
          // قواعد ثبت در bomSchema است و خطا زیر هر فیلد نمایش داده می‌شود
          noValidate
          headerContent={headerContent}
          headerActions={
            <div className="flex items-center gap-2">
              {(mode === "view" || mode === "edit") && bomId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-primary border-primary/30 hover:bg-primary/10 flex items-center gap-2"
                      onClick={() =>
                        addTab(
                          `درخت کالا/قلم`,
                          `/product-engineering/boms/tree/${bomId}`
                        )
                      }
                    >
                      <Network size={16} />
                      <span className="sr-only sm:not-sr-only">ساختار درختی</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>مشاهده ساختار درختی</TooltipContent>
                </Tooltip>
              )}

              {(mode === "create" || (mode === "edit" && canEdit)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplateDialogOpen(true)}
                      disabled={submitting}
                      className="h-9 text-primary border-primary/30 hover:bg-primary/10 flex items-center gap-2"
                    >
                      <CopyPlus size={16} />
                      <span className="sr-only sm:not-sr-only">فراخوانی از الگو</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>کپی اقلام از یک فرمول دیگر</TooltipContent>
                </Tooltip>
              )}

              {mode === "view" && canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGoToEdit}
                      className="h-9 bg-success hover:bg-success/90 text-success-foreground flex items-center gap-2"
                    >
                      <Pencil size={16} />
                      <span className="sr-only sm:not-sr-only">ویرایش</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ویرایش اطلاعات</TooltipContent>
                </Tooltip>
              )}
            </div>
          }
          tabs={[
            {
              key: "materials",
              label: "مواد اولیه و قطعات",
              icon: Layers,
              content: (
                <div className="h-full overflow-hidden [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default">
                  <EditableGrid<BOMRow>
                    columns={detailColumns}
                    data={details}
                    onChange={setDetails}
                    readOnly={isReadOnly}
                    permissions={{
                      view: true,
                      edit: !isReadOnly,
                      delete: !isReadOnly,
                      add: !isReadOnly,
                    }}
                    onAddRow={
                      isReadOnly
                        ? undefined
                        : () => ({
                            id: Math.random().toString(36).substr(2, 9),
                            childProductId: null,
                            quantity: 0,
                            inputQuantity: 0,
                            inputUnitId: 0,
                            baseUnitId: 0,
                            unitName: "-",
                            unitOptions: [],
                            wastePercentage: 0,
                            substitutes: [],
                          })
                    }
                  />
                </div>
              ),
            },
            {
              key: "outputs",
              label: `محصولات همزاد و فرعی${outputs.length ? ` (${outputs.length})` : ""}`,
              icon: Recycle,
              content: (
                <div className="h-full overflow-hidden p-1 [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default">
                  <BOMOutputsGrid
                    rows={outputs}
                    onChange={setOutputs}
                    readOnly={isReadOnly}
                    baseQuantity={headerData.baseQuantity}
                    error={(form.formState.errors.outputs as { message?: string } | undefined)?.message}
                  />
                </div>
              ),
            },
            {
              key: "notes",
              label: "توضیحات",
              icon: FileText,
              content: (
                <div className="p-4 [&_textarea:disabled]:cursor-default [&_textarea:disabled]:opacity-85">
                  <label className="block text-sm font-medium mb-2">
                    یادداشت فنی
                  </label>
                  <textarea
                    disabled={isReadOnly}
                    className="w-full border rounded-md p-2 min-h-[100px] disabled:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="توضیحات مهندسی..."
                  />
                </div>
              ),
            },
          ]}
        />
      </TooltipProvider>

      {activeRowIndex !== null && (
        <SubstitutesDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
          }}
          parentProductName={
            details[activeRowIndex]?.childProductName || "نامشخص"
          }
          initialData={details[activeRowIndex]?.substitutes || []}
          onSave={(newSubs) => {
            if (isReadOnly) return;
            setDetails((prev) =>
              prev.map((r, i) => (i === activeRowIndex ? { ...r, substitutes: newSubs } : r)),
            );
          }}
        />
      )}

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>فراخوانی اقلام از فرمول (الگو)</DialogTitle>
            <DialogDescription>
              با انتخاب یک الگو، اقلام آن به لیست فعلی اضافه خواهند شد.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <label className="text-sm font-medium mb-2 block">
              انتخاب BOM منبع:
            </label>
            <TableLookupCombobox<BOMLookupDto>
              items={templateOptions}
              loading={templateLoading}
              columns={[
                { key: "productName", label: "نام کالا/قلم", width: "40%" },
                { key: "version", label: "ورژن", width: "20%" },
                { key: "title", label: "عنوان", width: "40%" },
              ]}
              searchableFields={["productName", "productCode", "title"]}
              ariaLabel="انتخاب BOM منبع"
              displayFields={["productName", "version"]}
              onSearch={onSearchTemplate}
              onOpenChange={(isOpen) => {
                if (isOpen && templateOptions.length === 0)
                  onSearchTemplate("");
              }}
              onValueChange={(id) => {
                if (id) handleImportTemplate(id as number);
              }}
              placeholder="جستجو بر اساس نام کالا/قلم یا عنوان فرمول..."
            />
            <p className="text-xs text-muted-foreground mt-4 leading-5">
              نکته: با انتخاب یک الگو، تمام ردیف‌های فعلی جدول پاک شده و اقلام
              فرمول انتخاب شده جایگزین می‌شوند.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
