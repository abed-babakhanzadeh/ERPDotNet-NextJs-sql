"use client";

import type { LucideIcon } from "lucide-react";
import { ClipboardPlus, FilePlus2, PackagePlus, PackageSearch } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";

interface QuickAction {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: string;
}

const ACTIONS: QuickAction[] = [
  { title: "ثبت سند انبار", url: "/inventory/docs/create", icon: FilePlus2, permission: "Inventory.Docs.Create" },
  { title: "تعریف کالا", url: "/base-info/products/create", icon: PackagePlus, permission: "BaseInfo.Products.Create" },
  { title: "فرمول ساخت جدید", url: "/product-engineering/boms/create", icon: ClipboardPlus, permission: "ProductEngineering.BOM.Create" },
  { title: "موجودی لحظه‌ای", url: "/inventory/reports/current-stock", icon: PackageSearch, permission: "Inventory.Reports.CurrentStock" },
];

export function QuickActions() {
  const { hasPermission } = usePermissions();
  const { addTab } = useTabs();
  const actions = ACTIONS.filter((a) => hasPermission(a.permission));
  if (actions.length === 0) return null;

  return (
    <SectionCard title="دسترسی سریع">
      <div className="grid grid-cols-2 gap-2 p-3">
        {actions.map(({ title, url, icon: Icon }) => (
          <button
            key={url}
            type="button"
            onClick={() => addTab(title, url)}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-3 text-center text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="size-5" aria-hidden />
            {title}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
