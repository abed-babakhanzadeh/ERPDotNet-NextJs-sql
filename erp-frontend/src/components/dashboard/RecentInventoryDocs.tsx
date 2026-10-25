"use client";

import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionEmpty, SectionSkeleton } from "@/components/common/SectionCard";
import { InventoryDocStatusBadge } from "@/components/inventory/InventoryDocStatusBadge";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useTabs } from "@/providers/TabsProvider";
import inventoryService from "@/services/inventoryService";
import { formatDate } from "@/lib/format";
import { InventoryNature, type InventoryDocDto } from "@/types/inventory";

const NATURE = {
  [InventoryNature.Input]: { icon: ArrowDownCircle, className: "bg-success/10 text-success", label: "رسید" },
  [InventoryNature.Output]: { icon: ArrowUpCircle, className: "bg-warning/10 text-warning", label: "حواله" },
  [InventoryNature.Transfer]: { icon: ArrowLeftRight, className: "bg-info/10 text-info", label: "انتقال" },
};

export function RecentInventoryDocs() {
  const { addTab } = useTabs();
  const { data, isLoading, error } = useAsyncData((s) =>
    inventoryService.searchDocs({ pageNumber: 1, pageSize: 6, sortColumn: "docDate", sortDescending: true }, s),
  );
  const docs = (data?.items ?? []) as InventoryDocDto[];

  return (
    <SectionCard
      title="آخرین اسناد انبار"
      icon={FileStack}
      action={
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => addTab("اسناد انبار", "/inventory/docs")}>
          همه اسناد
        </Button>
      }
    >
      {isLoading ? (
        <SectionSkeleton rows={5} />
      ) : error ? (
        <SectionEmpty icon={FileStack} text={error} />
      ) : docs.length === 0 ? (
        <SectionEmpty icon={FileStack} text="هنوز سندی ثبت نشده است" />
      ) : (
        <ul className="divide-y">
          {docs.map((doc) => {
            const nature = NATURE[doc.nature] ?? NATURE[InventoryNature.Input];
            const Icon = nature.icon;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => addTab(`سند ${doc.docNumber}`, `/inventory/docs/edit/${doc.id}?mode=view`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${nature.className}`} title={nature.label}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {doc.docTypeTitle} <span className="tabular-nums text-muted-foreground">#{doc.docNumber}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[doc.warehouseTitle, doc.targetPartyName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{formatDate(doc.docDate)}</span>
                  <InventoryDocStatusBadge status={doc.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
