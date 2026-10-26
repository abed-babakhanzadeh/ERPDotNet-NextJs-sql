"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Calculator, ClipboardList, Info, Loader2, PackageSearch } from "lucide-react";

import ProtectedPage from "@/components/ui/ProtectedPage";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NumberField, SelectField } from "@/components/form/fields";
import { TableLookupCombobox, type ColumnDef } from "@/components/ui/TableLookupCombobox";
import { useLocalDataTable } from "@/hooks/useLocalDataTable";
import { useTabs } from "@/providers/TabsProvider";
import { productService } from "@/services/baseInfoService";
import { productionService } from "@/services/productionService";
import { handleApiError } from "@/lib/error-handling";
import type { MaterialPlanDto, MaterialPlanLineDto, MaterialPlanOrderDto, ProductionBomOptionDto } from "@/types/api";
import type { ColumnConfig } from "@/types";
import ProductionOrderStatusBadge from "../orders/components/ProductionOrderStatusBadge";

const fmt = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 4 });
const qty = (v: number, row: { unitName?: string }) => (
  <span className="tabular-nums">
    {fmt(v)} {row.unitName && <span className="text-xs text-muted-foreground">{row.unitName}</span>}
  </span>
);
const computed = { sortable: true, filterable: false } as const;

// اقدام پیشنهادی هر کالا؛ هم‌راستا با MaterialPlanning.PlanAction
const ACTION_TONE = { 0: "success", 1: "info", 2: "warning" } as const;

const lineColumns: ColumnConfig[] = [
  { key: "productCode", label: "کد کالا", type: "string", width: 120, mobile: "title" },
  {
    key: "productName",
    label: "کالا",
    type: "string",
    render: (v: string, row: MaterialPlanLineDto) => (
      <span>
        {v}
        {row.isDemandRoot && <span className="ms-2 text-xs text-primary">کالای درخواستی</span>}
      </span>
    ),
  },
  { key: "supplyTypeTitle", label: "نوع تأمین", type: "string" },
  { key: "level", label: "سطح", type: "number", width: 70 },
  { key: "openOrdersDemand", label: "نیاز سفارش‌های باز", type: "number", ...computed, render: qty },
  { key: "planDemand", label: "نیاز برنامه", type: "number", ...computed, render: qty },
  { key: "onHand", label: "موجودی قابل مصرف", type: "number", ...computed, render: qty },
  { key: "scheduledReceipts", label: "در حال تولید", type: "number", ...computed, render: qty },
  {
    key: "netShortage",
    label: "کسری خالص",
    type: "number",
    ...computed,
    render: (v: number, row: MaterialPlanLineDto) =>
      v > 0 ? <span className="font-semibold text-destructive">{qty(v, row)}</span> : <span className="text-muted-foreground">-</span>,
  },
  {
    key: "actionTitle",
    label: "اقدام پیشنهادی",
    type: "custom",
    sortable: false,
    filterable: false,
    render: (v: string, row: MaterialPlanLineDto) =>
      row.actionId === 0 ? (
        <StatusBadge tone="success" label="تأمین است" icon={false} />
      ) : (
        <StatusBadge tone={ACTION_TONE[row.actionId as 1 | 2]} label={v} icon={false} />
      ),
  },
  { key: "bomTitle", label: "فرمول", type: "string", render: (v: string | null) => v ?? "-" },
];

const orderColumns: ColumnConfig[] = [
  { key: "orderNumber", label: "شماره سفارش", type: "string", width: 120, mobile: "title" },
  { key: "productCode", label: "کد کالا", type: "string" },
  { key: "productName", label: "کالا", type: "string" },
  {
    key: "plannedStartDate",
    label: "شروع برنامه",
    type: "date",
    render: (v: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR") : "-"),
  },
  {
    key: "statusId",
    label: "وضعیت",
    type: "custom",
    filterable: false,
    render: (_: number, row: MaterialPlanOrderDto) => <ProductionOrderStatusBadge statusId={row.statusId} title={row.statusTitle} />,
  },
  {
    key: "canStart",
    label: "مواد",
    type: "custom",
    filterable: false,
    render: (v: boolean, row: MaterialPlanOrderDto) =>
      v ? (
        <StatusBadge tone="success" label="قابل شروع" />
      ) : (
        <StatusBadge tone="danger" label={`کسری ${row.shortCount.toLocaleString("fa-IR")} از ${row.materialCount.toLocaleString("fa-IR")} ماده`} />
      ),
  },
  {
    key: "shortages",
    label: "مواد کسری",
    type: "custom",
    sortable: false,
    filterable: false,
    render: (_: unknown, row: MaterialPlanOrderDto) =>
      row.shortages.length === 0 ? (
        "-"
      ) : (
        <span className="text-xs">
          {row.shortages.map((s) => `${s.productName}: ${fmt(s.shortage)} ${s.unitName}`).join("، ")}
        </span>
      ),
  },
];

const schema = z
  .object({
    productId: z.number().nullable(),
    bomHeaderId: z.number().nullable(),
    quantity: z.union([z.number(), z.literal("")]).nullable(),
    includeOpenOrders: z.boolean(),
  })
  .refine((v) => v.includeOpenOrders || !!v.productId, {
    path: ["productId"],
    message: "کالای درخواستی را انتخاب کنید یا سفارش‌های باز را در محاسبه بیاورید",
  })
  .refine((v) => !v.productId || (typeof v.quantity === "number" && v.quantity > 0), {
    path: ["quantity"],
    message: "مقدار درخواستی باید بیشتر از صفر باشد",
  });
type Values = z.infer<typeof schema>;

interface ProductOption {
  id: number;
  code: string;
  name: string;
  unitName: string;
}

const productColumns: ColumnDef[] = [
  { key: "code", label: "کد کالا", width: "30%" },
  { key: "name", label: "نام کالا", width: "50%" },
  { key: "unitName", label: "واحد", width: "20%" },
];

/** برنامه‌ریزی چندسطحی مواد: کسری مواد سفارش‌های باز و/یا ساخت مقدار مشخصی از یک کالا */
export default function MaterialPlanningPage() {
  const { addTab } = useTabs();
  const [plan, setPlan] = useState<MaterialPlanDto | null>(null);
  const [running, setRunning] = useState(false);
  const [shortOnly, setShortOnly] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [boms, setBoms] = useState<ProductionBomOptionDto[]>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { productId: null, bomHeaderId: null, quantity: 1, includeOpenOrders: true },
  });
  const productId = form.watch("productId");
  const includeOpenOrders = form.watch("includeOpenOrders");

  useEffect(() => {
    setBoms([]);
    if (!productId) return;
    productionService
      .getBoms(productId)
      .then((rows) => {
        setBoms(rows);
        form.setValue("bomHeaderId", rows[0]?.id ?? null);
      })
      .catch((error) => handleApiError(error, "خطا در دریافت فرمول‌های کالا"));
  }, [productId, form]);

  const searchProducts = async (term: string) => {
    setProductsLoading(true);
    try {
      const res = await productService.search({ pageNumber: 1, pageSize: 20, searchTerm: term });
      setProducts(res.items as ProductOption[]);
    } finally {
      setProductsLoading(false);
    }
  };

  const run = form.handleSubmit(async (values) => {
    setRunning(true);
    try {
      setPlan(
        await productionService.planMaterials({
          productId: values.productId,
          bomHeaderId: values.productId ? values.bomHeaderId : null,
          quantity: values.productId ? Number(values.quantity) : null,
          includeOpenOrders: values.includeOpenOrders,
        }),
      );
    } catch (error) {
      handleApiError(error, "خطا در محاسبه برنامه مواد");
    } finally {
      setRunning(false);
    }
  });

  // DataTable شناسه یکتا می‌خواهد؛ کالای درخواستی ممکن است جزء مواد هم باشد
  const lines = useMemo(
    () =>
      (plan?.lines ?? [])
        .filter((l) => !shortOnly || l.netShortage > 0)
        .map((l) => ({ ...l, id: `${l.isDemandRoot ? "root-" : ""}${l.productId}` })),
    [plan, shortOnly],
  );
  const linesTable = useLocalDataTable(lines, { isLoading: running });
  const ordersTable = useLocalDataTable(plan?.orders ?? [], { isLoading: running });
  const selectedProduct = products.find((p) => p.id === productId);
  const productError = form.formState.errors.productId?.message;
  const shortCount = plan?.lines.filter((l) => l.netShortage > 0 && !l.isDemandRoot).length ?? 0;

  return (
    <ProtectedPage permission="Production.Planning">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4" dir="rtl">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Calculator className="h-5 w-5 text-primary" />
          برنامه‌ریزی مواد و کسری
        </h1>

        <SectionCard title="پارامترهای محاسبه" icon={PackageSearch}>
          <Form {...form}>
            <form onSubmit={run} className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormItem className="lg:col-span-2">
                <FormLabel>کالای درخواستی (اختیاری)</FormLabel>
                <TableLookupCombobox<ProductOption>
                  value={productId}
                  items={products}
                  loading={productsLoading}
                  columns={productColumns}
                  searchableFields={["code", "name"]}
                  displayFields={["code", "name"]}
                  placeholder="جستجوی کالا..."
                  ariaLabel="کالای درخواستی"
                  aria-invalid={!!productError}
                  onSearch={searchProducts}
                  onOpenChange={(o) => o && products.length === 0 && searchProducts("")}
                  onValueChange={(id) => form.setValue("productId", (id as number) ?? null, { shouldValidate: form.formState.isSubmitted })}
                />
                {productError && <FormMessage>{productError}</FormMessage>}
              </FormItem>
              <SelectField
                control={form.control}
                name="bomHeaderId"
                label="فرمول ساخت"
                disabled={!productId || boms.length === 0}
                placeholder={productId && boms.length === 0 ? "فرمول فعالی ندارد" : "انتخاب کنید"}
                options={boms.map((b) => ({ value: b.id, label: `${b.title} (نسخه ${b.version}${b.isMain ? "، پیش‌فرض" : ""})` }))}
              />
              <NumberField
                control={form.control}
                name="quantity"
                label={`مقدار درخواستی${selectedProduct?.unitName ? ` (${selectedProduct.unitName})` : ""}`}
                min={0}
                step={0.001}
                disabled={!productId}
              />
              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
                <Switch
                  id="include-orders"
                  checked={includeOpenOrders}
                  onCheckedChange={(v) => form.setValue("includeOpenOrders", v, { shouldValidate: form.formState.isSubmitted })}
                />
                <Label htmlFor="include-orders">نیاز سفارش‌های تأییدشده و در حال تولید هم حساب شود</Label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={running} className="gap-1.5">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  محاسبه
                </Button>
              </div>
            </form>
          </Form>
        </SectionCard>

        {plan && (
          <>
            {(plan.warnings.length > 0 || plan.stockLimitedToAccessibleWarehouses) && (
              <div role="status" className="space-y-1 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                {plan.stockLimitedToAccessibleWarehouses && (
                  <p className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 shrink-0" aria-hidden />
                    موجودی فقط از انبارهایی حساب شده که به آن‌ها دسترسی دارید.
                  </p>
                )}
                {plan.warnings.map((w) => (
                  <p key={w} className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    {w}
                  </p>
                ))}
              </div>
            )}

            <SectionCard
              title={`کسری مواد (${shortCount.toLocaleString("fa-IR")} کالا کسری دارد)`}
              icon={PackageSearch}
              action={
                <div className="flex items-center gap-2">
                  <Switch id="short-only" checked={shortOnly} onCheckedChange={setShortOnly} />
                  <Label htmlFor="short-only" className="text-xs">
                    فقط کسری‌ها
                  </Label>
                </div>
              }
            >
              <div className="h-[60vh]">
                <DataTable columns={lineColumns} {...linesTable.tableProps} permissions={{ view: false, edit: false, delete: false }} />
              </div>
            </SectionCard>

            {plan.orders.length > 0 && (
              <SectionCard title="کسری مستقیم سفارش‌های باز (به ترتیب تاریخ شروع)" icon={ClipboardList}>
                <div className="h-[50vh]">
                  <DataTable
                    columns={orderColumns}
                    {...ordersTable.tableProps}
                    onView={(row: MaterialPlanOrderDto) => addTab(`سفارش تولید ${row.orderNumber}`, `/production/orders/${row.id}`)}
                    onRowDoubleClick={(row: MaterialPlanOrderDto) => addTab(`سفارش تولید ${row.orderNumber}`, `/production/orders/${row.id}`)}
                    permissions={{ view: true, edit: false, delete: false }}
                  />
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
