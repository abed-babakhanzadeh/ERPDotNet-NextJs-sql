"use client";

import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionGuard from "@/components/ui/PermissionGuard";
import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useServerDataTable, type ServerTableFetcher } from "@/hooks/useServerDataTable";
import { useTabPrefetch } from "@/hooks/useTabPrefetch";
import { useTabs } from "@/providers/TabsProvider";
import { useConfirm } from "@/providers/ConfirmProvider";
import { usePermissions } from "@/providers/PermissionProvider";
import { handleApiError } from "@/lib/error-handling";
import type { ColumnConfig } from "@/types";

interface BaseInfoListPageProps<TRow extends { id: number }> {
  title: string;
  icon: LucideIcon;
  /** مجوز مشاهده؛ مجوزهای Create و Delete با پسوند ساخته می‌شوند */
  permission: string;
  /** مسیر پایه صفحه؛ فرم‌ها در /create و /edit/{id} هستند */
  basePath: string;
  /** نام موجودیت برای دکمه‌ها و پیام‌ها، مثل «شرکت» */
  entityName: string;
  columns: ColumnConfig[];
  rowLabel: (row: TRow) => string;
  service: {
    search: ServerTableFetcher<TRow>;
    remove: (id: number) => Promise<void>;
  };
}

/** فهرست استاندارد اطلاعات پایه: جدول سروری، دکمه تعریف، ویرایش در تب و حذف با تأیید */
export default function BaseInfoListPage<TRow extends { id: number }>({
  title,
  icon,
  permission,
  basePath,
  entityName,
  columns,
  rowLabel,
  service,
}: BaseInfoListPageProps<TRow>) {
  const confirm = useConfirm();
  const { addTab } = useTabs();
  const { hasPermission } = usePermissions();
  useTabPrefetch([`${basePath}/create`]);

  const { tableProps, refresh, totalCount } = useServerDataTable<TRow>({
    fetcher: service.search,
    initialPageSize: 30,
  });

  const handleDelete = async (row: TRow) => {
    const ok = await confirm({
      title: `آیا از حذف ${entityName} «${rowLabel(row)}» اطمینان دارید؟`,
      tone: "danger",
      confirmText: "حذف",
    });
    if (!ok) return;
    try {
      await service.remove(row.id);
      toast.success(`${entityName} حذف شد`);
      refresh();
    } catch (error) {
      handleApiError(error, `خطا در حذف ${entityName}`);
    }
  };

  const actions = (
    <PermissionGuard permission={`${permission}.Create`}>
      <Button
        onClick={() => addTab(`تعریف ${entityName}`, `${basePath}/create`)}
        size="sm"
        className="h-8 gap-1.5"
      >
        <Plus size={16} />
        <span className="sr-only sm:not-sr-only text-xs">{entityName} جدید</span>
      </Button>
    </PermissionGuard>
  );

  return (
    <ProtectedPage permission={permission}>
      <BaseListLayout title={title} icon={icon} actions={actions} count={totalCount}>
        <DataTable
          columns={columns}
          permissions={{
            view: true,
            edit: hasPermission(`${permission}.Edit`),
            delete: hasPermission(`${permission}.Delete`),
          }}
          onEdit={(row: TRow) => addTab(`ویرایش ${rowLabel(row)}`, `${basePath}/edit/${row.id}`)}
          onDelete={handleDelete}
          {...tableProps}
        />
      </BaseListLayout>
    </ProtectedPage>
  );
}
