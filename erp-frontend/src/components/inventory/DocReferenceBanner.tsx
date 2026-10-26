"use client";

import { ExternalLink, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTabs } from "@/providers/TabsProvider";
import type { InventoryDocDto } from "@/types/inventory";

// سندهای مرجعی که اسناد انبار از روی آن‌ها ساخته می‌شوند
const REFERENCES: Record<string, { label: string; url: (id: number) => string }> = {
  ProductionOrder: { label: "سفارش تولید", url: (id) => `/production/orders/${id}` },
  StockCount: { label: "انبارگردانی", url: (id) => `/inventory/stock-counts/${id}` },
};

/** نمایش و باز کردن سند مرجعی که این سند انبار از آن ساخته شده است (ردیابی دوطرفه) */
export function DocReferenceBanner({ doc }: { doc: InventoryDocDto }) {
  const { addTab } = useTabs();
  const ref = doc.referenceEntityName ? REFERENCES[doc.referenceEntityName] : undefined;
  if (!ref || !doc.referenceEntityId) return null;

  const code = doc.referenceExternalCode || doc.referenceEntityId.toLocaleString("fa-IR", { useGrouping: false });
  const title = `${ref.label} ${code}`;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Link2 className="h-4 w-4" aria-hidden />
        این سند از <span className="font-medium text-foreground">{title}</span> ساخته شده است.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => addTab(title, ref.url(doc.referenceEntityId!))}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        باز کردن {ref.label}
      </Button>
    </div>
  );
}
