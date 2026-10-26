"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Ban, CheckCircle2, Factory, ListChecks, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import { useConfirm } from "@/providers/ConfirmProvider";
import { useTabs } from "@/providers/TabsProvider";
import { productionService } from "@/services/productionService";
import { handleApiError } from "@/lib/error-handling";
import type { ProductionOrderDto } from "@/types/api";
import ProductionOrderStatusBadge, { PRODUCTION_ORDER_STATUS } from "../components/ProductionOrderStatusBadge";
import ProductionOrderDialog from "../components/ProductionOrderDialog";
import MaterialRequirementsTable from "../components/MaterialRequirementsTable";

const faDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR") : "-");

export default function ProductionOrderPage() {
  const id = Number(useParams().id);
  const confirm = useConfirm();
  const { closeTab, activeTabId } = useTabs();
  const [order, setOrder] = useState<ProductionOrderDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await productionService.getOrder(id));
    } catch (error) {
      handleApiError(error, "خطا در دریافت سفارش تولید");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      handleApiError(error, "عملیات انجام نشد");
    } finally {
      setBusy(false);
    }
  };

  const release = () => act(() => productionService.releaseOrder(id), "سفارش تولید تأیید شد");

  const cancel = async () => {
    const ok = await confirm({
      title: `سفارش تولید ${order?.orderNumber} ابطال شود؟`,
      description: "سفارش ابطال‌شده دیگر قابل تأیید یا تولید نیست.",
      confirmText: "ابطال سفارش",
      tone: "danger",
    });
    if (ok) await act(() => productionService.cancelOrder(id), "سفارش تولید ابطال شد");
  };

  const remove = async () => {
    const ok = await confirm({
      title: `سفارش تولید ${order?.orderNumber} حذف شود؟`,
      confirmText: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await productionService.removeOrder(id);
      toast.success("سفارش تولید حذف شد");
      closeTab(activeTabId);
    } catch (error) {
      handleApiError(error, "خطا در حذف سفارش تولید");
    }
  };

  if (!order)
    return (
      <ProtectedPage permission="Production.Orders">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedPage>
    );

  const isDraft = order.statusId === PRODUCTION_ORDER_STATUS.draft;
  const cancellable = isDraft || order.statusId === PRODUCTION_ORDER_STATUS.released;
  const info: [string, React.ReactNode][] = [
    ["کالا", `${order.productCode} - ${order.productName}`],
    ["مقدار تولید", `${order.quantity.toLocaleString("fa-IR")} ${order.unitName}`],
    ["فرمول", `${order.bomTitle} (نسخه ${order.bomVersion})`],
    ["شروع برنامه", faDate(order.plannedStartDate)],
    ["پایان برنامه", faDate(order.plannedEndDate)],
    ["توضیحات", order.description || "-"],
  ];

  return (
    <ProtectedPage permission="Production.Orders">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Factory className="h-5 w-5 text-primary" />
            سفارش تولید {order.orderNumber}
            <ProductionOrderStatusBadge statusId={order.statusId} title={order.statusTitle} />
          </h1>
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <PermissionGuard permission="Production.Orders.Edit">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)} disabled={busy}>
                  <Pencil className="h-4 w-4" /> ویرایش
                </Button>
              </PermissionGuard>
            )}
            {isDraft && (
              <PermissionGuard permission="Production.Orders.Release">
                <Button size="sm" className="gap-1.5" onClick={release} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> تأیید سفارش
                </Button>
              </PermissionGuard>
            )}
            {cancellable && (
              <PermissionGuard permission="Production.Orders.Release">
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={cancel} disabled={busy}>
                  <Ban className="h-4 w-4" /> ابطال
                </Button>
              </PermissionGuard>
            )}
            {isDraft && (
              <PermissionGuard permission="Production.Orders.Delete">
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={remove} disabled={busy}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </PermissionGuard>
            )}
          </div>
        </div>

        <SectionCard title="مشخصات سفارش" icon={Factory}>
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {info.map(([label, value]) => (
              <div key={label}>
                <dt className="mb-1 text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="نیاز مواد" icon={ListChecks}>
          <div className="p-4">
            <MaterialRequirementsTable materials={order.materials} />
          </div>
        </SectionCard>
      </div>

      <ProductionOrderDialog
        open={editing}
        order={order}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          load();
        }}
      />
    </ProtectedPage>
  );
}
