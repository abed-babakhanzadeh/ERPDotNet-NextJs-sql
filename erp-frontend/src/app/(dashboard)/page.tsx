"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { usePermissions } from "@/providers/PermissionProvider";
import { authService } from "@/services/userAccessService";
import { formatLongDate } from "@/lib/format";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { MyInboxTasks } from "@/components/dashboard/MyInboxTasks";
import { RecentInventoryDocs } from "@/components/dashboard/RecentInventoryDocs";
import { InventoryDocStatusChart } from "@/components/dashboard/InventoryDocStatusChart";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
  const { hasPermission } = usePermissions();
  const { data: profile } = useAsyncData(() => authService.getProfile());

  const canDocs = hasPermission("Inventory.Docs");
  const canInbox = hasPermission("Workflow.Tasks.Inbox");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {profile?.firstName ? `سلام ${profile.firstName}` : "داشبورد"}
          </h1>
          <p className="text-sm text-muted-foreground">{formatLongDate(new Date())}</p>
        </div>
      </div>

      <DashboardKpis />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canDocs && <RecentInventoryDocs />}
          {canInbox && <MyInboxTasks />}
        </div>
        <div className="space-y-4">
          <QuickActions />
          {canDocs && <InventoryDocStatusChart />}
        </div>
      </div>
    </div>
  );
}
