"use client";

import { useRouter } from "next/navigation";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { DataTable } from "@/components/data-table";
import { ColumnConfig } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function InboxPage() {
  const router = useRouter();

  // دقت کنید: چون apiClient خودش /api را اضافه می‌کند، اینجا فقط مسیر کنترلر را می‌دهیم
  const { tableProps } = useServerDataTable({
    endpoint: "/Workflow/Tasks/inbox",
    initialPageSize: 10,
  });

  const columns: ColumnConfig[] = [
    {
      key: "processTitle",
      title: "نوع فرآیند",
      label: "نوع فرآیند",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      key: "taskTitle",
      title: "عنوان وظیفه",
      label: "عنوان وظیفه",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      key: "targetRecordId",
      title: "شماره سند",
      label: "شماره سند",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      key: "stateTitle",
      title: "مرحله فعلی",
      label: "مرحله فعلی",
      type: "string",
      render: (val: string) => <Badge variant="secondary">{val}</Badge>,
    },
    {
      key: "createdAt",
      title: "تاریخ ارجاع",
      label: "تاریخ ارجاع",
      type: "date",
      sortable: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-800">
          کارتابل وظایف (Inbox)
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
