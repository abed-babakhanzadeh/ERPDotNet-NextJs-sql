"use client";

import React, { useState, useMemo, useEffect } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import {
  Layers,
  FileText,
  // Save, // حذف شد (توسط BaseFormLayout مدیریت می‌شود)
  Pencil,
  // X, // حذف شد (توسط BaseFormLayout مدیریت می‌شود)
  // Loader2, // حذف شد
  CopyPlus,
  Network,
  FileSearch,
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
} from "@/components/ui/tooltip"; // اضافه شده برای موبایل
import SubstitutesDialog, { SubstituteRow } from "./SubstitutesDialog";

// Hooks & Providers
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";

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

interface BOMLookupDto {
  id: number;
  title: string;
  version: string;
  productName: string;
  productCode: string;
}

interface BOMHeaderState {
  productId: number | null;
  productName?: string;
  title: string;
  version: string;
  type: number;
  fromDate: string;
  toDate?: string;
  isActive: boolean;
}

interface UnitOption {
  value: number;
  label: string;
  factor: number;
}

interface BOMRow {
  id: string;
  childProductId: number | null;
  childProductCode?: string;
  childProductName?: string;

  unitName: string;
  baseUnitId: number;
  quantity: number;

  inputQuantity: number;
  inputUnitId: number;

  unitOptions: UnitOption[];

  wastePercentage: number;
  substitutes: SubstituteRow[];
}

export default function BOMForm({ mode, bomId }: BOMFormProps) {
  const { closeTab, activeTabId, addTab } = useTabs();
  const { hasPermission } = usePermissions();

  const isReadOnly = mode === "view";
  const canEdit = hasPermission("ProductEngineering.BOM.Create");

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- State مدیریت فرم ---
  const [headerData, setHeaderData] = useState<BOMHeaderState>({
    productId: null,
    title: "",
    version: "1.0",
    type: 1,
    fromDate: new Date().toISOString().split("T")[0],
    toDate: undefined,
    isActive: true, // <--- پیش‌فرض true
  });

  const [details, setDetails] = useState<BOMRow[]>([]);

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

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && bomId) {
      loadBOMData(bomId);
    }
  }, [mode, bomId]);

  const safeCloseTab = () => {
    // تابع کمکی برای بستن تب با کمی تاخیر جهت جلوگیری از تداخل
    setTimeout(() => {
      closeTab(activeTabId);
    }, 0);
  };

  const fetchProductUnits = async (
    productId: number
  ): Promise<UnitOption[]> => {
    try {
      const { data } = await apiClient.get(`/BaseInfo/Products/${productId}`);
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
      const { data } = await apiClient.get(`/ProductEngineering/BOMs/${id}`);

      setHeaderData({
        productId: data.productId,
        productName: data.productName,
        title: data.title || "",
        version: data.version,
        type: data.typeId,
        fromDate: data.fromDate
          ? data.fromDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        toDate: data.toDate ? data.toDate.split("T")[0] : undefined,
        isActive: data.isActive ?? true,
      });

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

      setDetails(mappedDetails);
    } catch (error) {
      toast.error("خطا در دریافت اطلاعات BOM");
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
    const res = await apiClient.post("/BaseInfo/Products/search", {
      pageNumber: 1,
      pageSize: 20,
      searchTerm: term,
    });
    return res.data.items || [];
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
      const res = await apiClient.post("/ProductEngineering/BOMs/search", {
        pageNumber: 1,
        pageSize: 20,
        searchTerm: term,
      });
      setTemplateOptions(res.data.items || []);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportTemplate = async (sourceBomId: number) => {
    setTemplateLoading(true);
    try {
      const { data } = await apiClient.get(
        `/ProductEngineering/BOMs/${sourceBomId}`
      );

      if (data.details && data.details.length > 0) {
        const newRows = await mapTemplateToRows(data.details);
        setDetails(newRows);
        toast.success(`${newRows.length} ردیف با موفقیت فراخوانی شد.`);
        setTemplateDialogOpen(false);
      } else {
        toast.warning("BOM انتخاب شده هیچ ردیفی ندارد.");
      }
    } catch (error) {
      toast.error("خطا در فراخوانی الگو");
    } finally {
      setTemplateLoading(false);
    }
  };

  const productLookupColumns: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "کد کالا", width: "30%" },
      { key: "name", label: "نام کالا", width: "50%" },
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
        colSpan: 1, // یا بسته به لی‌اوت شما
      },
      {
        name: "version",
        label: "نسخه",
        type: "text",
        required: true,
        disabled: isReadOnly,
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
        name: "type",
        label: "نوع فرمول",
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
    [isReadOnly]
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
                disabled={isReadOnly}
                onSearch={onSearchGrid}
                onOpenChange={(isOpen) => {
                  if (isOpen && gridProductOptions.length === 0)
                    onSearchGrid("");
                }}
                onValueChange={async (newId, item) => {
                  const units = await fetchProductUnits(newId as number);

                  const newDetails = [...details];
                  newDetails[index] = {
                    ...newDetails[index],
                    childProductId: newId as number,
                    childProductName: item?.name,
                    childProductCode: item?.code,
                    baseUnitId: units[0].value,
                    unitName: units[0].label,
                    inputUnitId: units[0].value,
                    inputQuantity: 1,
                    quantity: 1,
                    unitOptions: units,
                    substitutes: [],
                  };
                  setDetails(newDetails);
                }}
              />
            </div>

            {row.childProductId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
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
            className="w-full h-8 border rounded px-2 text-center focus:ring-2 focus:ring-primary/20 outline-none"
            value={row.inputQuantity}
            disabled={isReadOnly}
            onChange={(e) => {
              const val = Number(e.target.value);
              const newDetails = [...details];
              const currentRow = newDetails[index];
              const selectedUnit = currentRow.unitOptions?.find(
                (u) => u.value == currentRow.inputUnitId
              );
              const factor = selectedUnit ? selectedUnit.factor : 1;
              currentRow.inputQuantity = val;
              currentRow.quantity = val * factor;
              setDetails(newDetails);
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
            className="w-full h-8 border rounded px-1 text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            value={row.inputUnitId}
            disabled={isReadOnly}
            onChange={(e) => {
              const newUnitId = Number(e.target.value);
              const newDetails = [...details];
              const currentRow = newDetails[index];
              const selectedUnit = currentRow.unitOptions?.find(
                (u) => u.value == newUnitId
              );
              const factor = selectedUnit ? selectedUnit.factor : 1;
              currentRow.inputUnitId = newUnitId;
              currentRow.quantity = currentRow.inputQuantity * factor;
              setDetails(newDetails);
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
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "text-muted-foreground border-dashed"
              }`}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!headerData.productId) {
      toast.error("محصول نهایی انتخاب نشده");
      return;
    }
    if (details.length === 0) {
      toast.error("اقلام فرمول وارد نشده");
      return;
    }

    setSubmitting(true);

    try {
      const safeFromDate = formatDateToISO(headerData.fromDate);
      const cleanToDate =
        headerData.toDate && headerData.toDate.trim() !== ""
          ? formatDateToISO(headerData.toDate)
          : null;

      const cleanDetails = details.map((d) => {
        if (!d.childProductId) {
          throw new Error("یکی از ردیف‌های جدول فاقد کالا است.");
        }

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
        version: headerData.version || "1.0",
        type: Number(headerData.type) || 1,
        fromDate: safeFromDate,
        toDate: cleanToDate,
        isActive: headerData.isActive,
        details: cleanDetails,
      };

      if (mode === "edit" && bomId) {
        payload.id = Number(bomId);
      }

      // console.log("PAYLOAD SENT TO SERVER:", JSON.stringify(payload, null, 2));

      if (mode === "create") {
        payload.productId = Number(headerData.productId);
        await apiClient.post("/ProductEngineering/BOMs", payload);
        toast.success("BOM با موفقیت ایجاد شد");
      } else if (mode === "edit" && bomId) {
        await apiClient.put(`/ProductEngineering/BOMs/${bomId}`, payload);
        toast.success("تغییرات با موفقیت ذخیره شد");
      }

      safeCloseTab();
    } catch (error: any) {
      console.error("Full Submission Error:", error);

      if (error.message === "یکی از ردیف‌های جدول فاقد کالا است.") {
        toast.error(error.message);
      } else {
        const status = error.response?.status;
        const validationErrors = error.response?.data?.errors;
        const detail = error.response?.data?.detail;

        if (validationErrors) {
          const firstField = Object.keys(validationErrors)[0];
          const firstMsg = validationErrors[firstField][0];
          toast.error(`خطای ورودی: ${firstMsg}`);
        } else if (detail) {
          toast.error(`خطای سرور: ${detail}`);
        } else {
          toast.error(`خطا در ارتباط با سرور (${status || "نامشخص"})`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToEdit = () => {
    if (bomId) addTab(`ویرایش BOM`, `/product-engineering/boms/edit/${bomId}`);
  };

  const headerContent = (
    // تغییرات: اضافه کردن کلاس‌های [&_...] برای تغییر استایل فیلدهای غیرفعال
    <div className="space-y-4 [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default [&_textarea:disabled]:cursor-default [&_input:disabled]:opacity-85 [&_select:disabled]:opacity-85 [&_textarea:disabled]:opacity-85">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-sm font-medium flex gap-1">
            محصول نهایی (Parent)
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
            onValueChange={(val, item) => {
              setHeaderData((prev) => ({
                ...prev,
                productId: val as number,
                productName: item?.name,
              }));
            }}
          />
        </div>
      </div>
      <AutoForm
        fields={headerFields}
        data={headerData}
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
          // ارسال onSubmit و onCancel فقط در حالت‌های غیر مشاهده
          // این کار باعث می‌شود دکمه‌های پیش‌فرض BaseFormLayout به درستی کنترل شوند
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onCancel={isReadOnly ? undefined : safeCloseTab}
          formId="bom-form"
          submitting={submitting}
          isLoading={loadingData}
          headerContent={headerContent}
          headerActions={
            <div className="flex items-center gap-2">
              {/* دکمه ساختار درختی (در حالت مشاهده و ویرایش) */}
              {(mode === "view" || mode === "edit") && bomId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-purple-700 border-purple-200 hover:bg-purple-50 flex items-center gap-2"
                      onClick={() =>
                        addTab(
                          `درخت محصول`,
                          `/product-engineering/boms/tree/${bomId}`
                        )
                      }
                    >
                      <Network size={16} />
                      <span className="hidden sm:inline">ساختار درختی</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>مشاهده ساختار درختی</TooltipContent>
                </Tooltip>
              )}

              {/* دکمه فراخوانی از الگو (فقط ایجاد و ویرایش با دسترسی) */}
              {(mode === "create" || (mode === "edit" && canEdit)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplateDialogOpen(true)}
                      disabled={submitting}
                      className="h-9 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <CopyPlus size={16} />
                      <span className="hidden sm:inline">فراخوانی از الگو</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>کپی اقلام از یک فرمول دیگر</TooltipContent>
                </Tooltip>
              )}

              {/* دکمه رفتن به حالت ویرایش (فقط در حالت مشاهده) */}
              {mode === "view" && canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGoToEdit}
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                    >
                      <Pencil size={16} />
                      <span className="hidden sm:inline">ویرایش</span>
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
                // تغییرات: اضافه کردن wrapper برای اصلاح نشانگر موس در جدول
                <div className="h-full [&_input:disabled]:cursor-default [&_select:disabled]:cursor-default [&_input:disabled]:opacity-100 [&_select:disabled]:opacity-100">
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

      {/* مودال‌ها تغییری نکردند */}
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
            const newDetails = [...details];
            newDetails[activeRowIndex].substitutes = newSubs;
            setDetails(newDetails);
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
                { key: "productName", label: "نام محصول", width: "40%" },
                { key: "version", label: "ورژن", width: "20%" },
                { key: "title", label: "عنوان", width: "40%" },
              ]}
              searchableFields={["productName", "productCode", "title"]}
              displayFields={["productName", "version"]}
              onSearch={onSearchTemplate}
              onOpenChange={(isOpen) => {
                if (isOpen && templateOptions.length === 0)
                  onSearchTemplate("");
              }}
              onValueChange={(id) => {
                if (id) handleImportTemplate(id as number);
              }}
              placeholder="جستجو بر اساس نام محصول یا عنوان فرمول..."
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
