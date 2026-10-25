"use client";

import { Boxes, ClipboardList, FileStack, Inbox } from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";
import { productService } from "@/services/baseInfoService";
import { bomService } from "@/services/bomService";
import inventoryService from "@/services/inventoryService";
import { workflowService } from "@/services/workflowService";

// فقط تعداد کل لازم است؛ یک ردیف کافی است
const COUNT_QUERY = { pageNumber: 1, pageSize: 1 };

/** هر کارت فقط سرویس ماژول خودش را صدا می‌زند و بدون مجوز آن ماژول نمایش داده نمی‌شود */
export function DashboardKpis() {
  const { hasPermission } = usePermissions();
  const { addTab } = useTabs();

  const canInbox = hasPermission("Workflow.Tasks.Inbox");
  const canDocs = hasPermission("Inventory.Docs");
  const canProducts = hasPermission("BaseInfo.Products");
  const canBoms = hasPermission("ProductEngineering.BOM");

  const inbox = useAsyncData((s) => workflowService.getInboxTasks(COUNT_QUERY, s), canInbox);
  const docs = useAsyncData((s) => inventoryService.searchDocs(COUNT_QUERY, s), canDocs);
  const products = useAsyncData((s) => productService.search(COUNT_QUERY, s), canProducts);
  const boms = useAsyncData((s) => bomService.search(COUNT_QUERY, s), canBoms);

  const cards = [
    canInbox && (
      <KpiCard
        key="inbox"
        label="کارهای منتظر من"
        icon={Inbox}
        tone="warning"
        value={inbox.data?.totalCount}
        isLoading={inbox.isLoading}
        error={inbox.error}
        hint="در کارتابل"
        onClick={() => addTab("کارتابل من", "/workflow/inbox")}
      />
    ),
    canDocs && (
      <KpiCard
        key="docs"
        label="اسناد انبار"
        icon={FileStack}
        tone="info"
        value={docs.data?.totalCount}
        isLoading={docs.isLoading}
        error={docs.error}
        hint="همه وضعیت‌ها"
        onClick={() => addTab("اسناد انبار", "/inventory/docs")}
      />
    ),
    canProducts && (
      <KpiCard
        key="products"
        label="کالاها"
        icon={Boxes}
        value={products.data?.totalCount}
        isLoading={products.isLoading}
        error={products.error}
        hint="تعریف‌شده در سیستم"
        onClick={() => addTab("مدیریت کالاها", "/base-info/products")}
      />
    ),
    canBoms && (
      <KpiCard
        key="boms"
        label="فرمول‌های ساخت"
        icon={ClipboardList}
        tone="success"
        value={boms.data?.totalCount}
        isLoading={boms.isLoading}
        error={boms.error}
        hint="همه نسخه‌ها"
        onClick={() => addTab("فرمول‌های ساخت", "/product-engineering/boms")}
      />
    ),
  ].filter(Boolean);

  if (cards.length === 0) return null;
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards}</div>;
}
