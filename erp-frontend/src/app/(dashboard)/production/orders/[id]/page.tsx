"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  CircleCheckBig,
  Factory,
  FileStack,
  ListChecks,
  Loader2,
  PackageMinus,
  PackagePlus,
  Pencil,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import { useConfirm } from "@/providers/ConfirmProvider";
import { useTabs } from "@/providers/TabsProvider";
import { productionService } from "@/services/productionService";
import { handleApiError } from "@/lib/error-handling";
import type { ProductionOrderDto, ProductionOrderProgressDto } from "@/types/api";
import ProductionOrderStatusBadge, { PRODUCTION_ORDER_STATUS } from "../components/ProductionOrderStatusBadge";
import ProductionOrderDialog from "../components/ProductionOrderDialog";
import MaterialRequirementsTable from "../components/MaterialRequirementsTable";
import IssueMaterialsDialog from "../components/IssueMaterialsDialog";
import ReceiveOutputDialog from "../components/ReceiveOutputDialog";
import {
  LinkedDocsTable,
  MaterialProgressTable,
  MaterialVarianceTable,
  OutputSummary,
} from "../components/ProductionProgressSection";

const faDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR") : "-");

export default function ProductionOrderPage() {
  const id = Number(useParams().id);
  const confirm = useConfirm();
  const { addTab, closeTab, activeTabId } = useTabs();
  const [order, setOrder] = useState<ProductionOrderDto | null>(null);
  const [progress, setProgress] = useState<ProductionOrderProgressDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = await productionService.getOrder(id);
      setOrder(loaded);
      // پیشرفت فقط پس از تأیید معنا دارد؛ پیش‌نویس سند انباری ندارد
      setProgress(loaded.statusId === PRODUCTION_ORDER_STATUS.draft ? null : await productionService.getProgress(id));
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

  // سند پیش‌نویس انبار در تب جدید باز می‌شود تا بچ، سریال و قفسه سطرها تکمیل شود
  const openNewDoc = (docId: number, title: string, close: () => void) => {
    close();
    toast.success(`${title} پیش‌نویس ساخته شد؛ سطرها را تکمیل و سند را برای تأیید ارسال کنید`);
    addTab(`${title} ${order?.orderNumber}`, `/inventory/docs/edit/${docId}`);
    load();
  };

  const complete = async () => {
    const short = progress?.materials.filter((m) => m.issuedQuantity < m.requiredQuantity).length ?? 0;
    const ok = await confirm({
      title: `سفارش تولید ${order?.orderNumber} تکمیل شود؟`,
      description:
        short > 0
          ? `${short.toLocaleString("fa-IR")} ماده کمتر از نیاز فرمول صادر شده است. پس از تکمیل، سند انبار جدیدی برای این سفارش صادر نمی‌شود.`
          : "پس از تکمیل، سند انبار جدیدی برای این سفارش صادر نمی‌شود.",
      confirmText: "تکمیل سفارش",
    });
    if (ok) await act(() => productionService.completeOrder(id), "سفارش تولید تکمیل شد");
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
  const isReleased = order.statusId === PRODUCTION_ORDER_STATUS.released;
  const inProgress = order.statusId === PRODUCTION_ORDER_STATUS.inProgress;
  const runnable = isReleased || inProgress;
  // سفارش در حال تولید فقط وقتی ابطال می‌شود که همه اسنادش رد یا باطل شده باشند (بک‌اند بررسی می‌کند)
  const cancellable = isDraft || runnable;
  const remainingOutput = progress
    ? Math.max(0, progress.orderQuantity - progress.receivedQuantity - progress.pendingReceiptQuantity)
    : 0;
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
            {runnable && progress && (
              <PermissionGuard permission="Production.Orders.Execute">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIssuing(true)} disabled={busy}>
                  <PackageMinus className="h-4 w-4" /> حواله مواد
                </Button>
              </PermissionGuard>
            )}
            {runnable && progress && (
              <PermissionGuard permission="Production.Orders.Execute">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReceiving(true)} disabled={busy}>
                  <PackagePlus className="h-4 w-4" /> رسید محصول
                </Button>
              </PermissionGuard>
            )}
            {inProgress && (
              <PermissionGuard permission="Production.Orders.Execute">
                <Button size="sm" className="gap-1.5" onClick={complete} disabled={busy}>
                  <CircleCheckBig className="h-4 w-4" /> تکمیل سفارش
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

        {progress ? (
          <>
            <SectionCard title="محصول" icon={PackagePlus}>
              <OutputSummary progress={progress} unitName={order.unitName} />
            </SectionCard>
            <SectionCard title="نیاز و مصرف مواد" icon={ListChecks}>
              <div className="p-4">
                <MaterialProgressTable progress={progress} />
              </div>
            </SectionCard>
            <SectionCard title="انحراف مصرف مواد" icon={Scale}>
              <div className="p-4">
                <MaterialVarianceTable progress={progress} />
              </div>
            </SectionCard>
            <SectionCard title="اسناد انبار" icon={FileStack}>
              <div className="p-4">
                <LinkedDocsTable progress={progress} />
              </div>
            </SectionCard>
          </>
        ) : (
          <SectionCard title="نیاز مواد" icon={ListChecks}>
            <div className="p-4">
              <MaterialRequirementsTable materials={order.materials} />
            </div>
          </SectionCard>
        )}
      </div>

      {progress && (
        <>
          <IssueMaterialsDialog
            open={issuing}
            order={order}
            materials={progress.materials.filter((m) => m.materialId != null)}
            onClose={() => setIssuing(false)}
            onIssued={(docId) => openNewDoc(docId, "حواله مواد", () => setIssuing(false))}
          />
          <ReceiveOutputDialog
            open={receiving}
            order={order}
            remainingQuantity={remainingOutput}
            onClose={() => setReceiving(false)}
            onReceived={(docId) => openNewDoc(docId, "رسید محصول", () => setReceiving(false))}
          />
        </>
      )}

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
