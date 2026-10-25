"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";

import BaseListLayout from "@/components/layout/BaseListLayout";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useConfirm } from "@/providers/ConfirmProvider";
import { workflowService } from "@/services/workflowService";
import { handleApiError } from "@/lib/error-handling";
import type { DelegationDto } from "@/types/api";
import CreateDelegationDialog from "./components/CreateDelegationDialog";

const faDate = (iso: string) => new Date(iso).toLocaleDateString("fa-IR");

function DelegationStatus({ d }: { d: DelegationDto }) {
  if (d.isRevoked) return <StatusBadge tone="neutral" label="لغو شده" />;
  if (d.isActive) return <StatusBadge tone="success" label="فعال" />;
  return new Date(d.startDate) > new Date() ? (
    <StatusBadge tone="info" label="آینده" />
  ) : (
    <StatusBadge tone="neutral" label="پایان یافته" />
  );
}

export default function DelegationsPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<DelegationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await workflowService.getDelegations());
    } catch (error) {
      handleApiError(error, "خطا در دریافت تفویض‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (d: DelegationDto) => {
    if (
      !(await confirm({
        title: `تفویض به ${d.toUserName} لغو شود؟`,
        tone: "danger",
        confirmText: "لغو تفویض",
      }))
    )
      return;
    try {
      await workflowService.revokeDelegation(d.id);
      toast.success("تفویض لغو شد");
      load();
    } catch (error) {
      handleApiError(error, "خطا در لغو تفویض");
    }
  };

  return (
    <ProtectedPage permission="Workflow.Tasks.Delegate">
      <BaseListLayout
        title="تفویض اختیار"
        description="سپردن کارتابل به همکار در مرخصی و مأموریت"
        icon={UserCheck}
        count={rows.length}
        actions={
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} /> تفویض جدید
          </Button>
        }
      >
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">نوع</TableHead>
                <TableHead className="text-right">همکار</TableHead>
                <TableHead className="text-right">بازه</TableHead>
                <TableHead className="text-right">دلیل</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="inline animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    تفویضی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.isMine ? "داده‌شده" : "دریافتی"}</TableCell>
                    <TableCell className="font-medium">
                      {d.isMine ? d.toUserName : d.fromUserName}
                    </TableCell>
                    <TableCell className="text-sm">
                      {faDate(d.startDate)} تا {faDate(d.endDate)}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-sm text-muted-foreground"
                      title={d.reason ?? ""}
                    >
                      {d.reason || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <DelegationStatus d={d} />
                    </TableCell>
                    <TableCell className="text-left">
                      {d.isMine &&
                        !d.isRevoked &&
                        new Date(d.endDate) > new Date() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 border border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                            aria-label={`لغو تفویض به ${d.toUserName}`}
                            onClick={() => revoke(d)}
                          >
                            لغو
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </BaseListLayout>

      <CreateDelegationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </ProtectedPage>
  );
}
