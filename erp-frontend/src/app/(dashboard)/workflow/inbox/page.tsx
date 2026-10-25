"use client";

import { useRouter } from "next/navigation";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { DataTable } from "@/components/data-table";
import { ColumnConfig } from "@/types";
import { Badge } from "@/components/ui/badge";
import { workflowService } from "@/services/workflowService";
import DueDateBadge from "@/components/modules/workflow/DueDateBadge";
import { Button } from "@/components/ui/button";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { UserCheck } from "lucide-react";

export default function InboxPage() {
  const router = useRouter();

  const { tableProps } = useServerDataTable({
    fetcher: workflowService.getInboxTasks,
    initialPageSize: 10,
  });

  const columns: ColumnConfig[] = [
    {
      key: "processTitle",
      label: "نوع فرآیند",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      key: "taskTitle",
      label: "عنوان وظیفه",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      key: "targetRecordId",
      label: "شماره سند",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      key: "stateTitle",
      label: "مرحله فعلی",
      type: "string",
      render: (val: string) => <Badge variant="secondary">{val}</Badge>,
    },
    {
      key: "createdAt",
      label: "تاریخ ارجاع",
      type: "date",
      sortable: true,
    },
    {
      key: "dueDate",
      label: "سررسید",
      type: "custom",
      sortable: true,
      render: (val: string | null, row: any) => (
        <DueDateBadge dueDate={val} isOverdue={row.isOverdue} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-foreground">
          کارتابل وظایف (Inbox)
        </h1>
        <PermissionGuard permission="Workflow.Tasks.Delegate">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/workflow/delegations")}
          >
            <UserCheck className="h-4 w-4" /> تفویض اختیار
          </Button>
        </PermissionGuard>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <DataTable
          columns={columns}
          {...tableProps}
          // استفاده از اکشن‌های توکارِ کامپوننت دیتاتیبل شما (آیکون چشم)
          onView={(row: any) => {
            router.push(`/workflow/inbox/${row.taskId}`);
          }}
          permissions={{ view: true, edit: false, delete: false }}
        />
      </div>
    </div>
  );
}
