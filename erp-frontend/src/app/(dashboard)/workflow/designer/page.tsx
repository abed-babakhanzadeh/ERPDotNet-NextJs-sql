"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useServerDataTable } from "@/hooks/useServerDataTable";
import { DataTable } from "@/components/data-table";
import { ColumnConfig } from "@/types";

import { workflowService } from "@/services/workflowService";
import { ProcessDto } from "@/types/workflow";

export default function WorkflowDesignerPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProcess, setNewProcess] = useState({
    processCode: "",
    title: "",
    targetEntityName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { tableProps, refresh } = useServerDataTable<ProcessDto>({
    endpoint: "/Workflow/Tasks/processes/list",
    initialPageSize: 10,
  });

  const handleCreateProcess = async () => {
    if (
      !newProcess.processCode ||
      !newProcess.title ||
      !newProcess.targetEntityName
    ) {
      toast.error("لطفاً تمامی فیلدها را پر کنید.");
      return;
    }

    setIsSubmitting(true);
    try {
      await workflowService.createProcess(newProcess);
      toast.success("فرآیند جدید با موفقیت ایجاد شد!");
      setIsCreateModalOpen(false);
      setNewProcess({ processCode: "", title: "", targetEntityName: "" });
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در ایجاد فرآیند");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 اصلاح نهایی: اضافه شدن title به تمام ستون‌ها (طبق ساختار ColumnConfig شما)
  const columns: ColumnConfig[] = [
    {
      key: "processCode",
      title: "کد فرآیند",
      label: "کد فرآیند",
      type: "string",
    },
    {
      key: "title",
      title: "عنوان فرآیند",
      label: "عنوان فرآیند",
      type: "string",
    },
    {
      key: "targetEntityName",
      title: "موجودیت هدف",
      label: "موجودیت هدف",
      type: "string",
    },
    {
      key: "activeVersionNumber",
      title: "نسخه فعال",
      label: "نسخه فعال",
      type: "custom",
      render: (_, row: ProcessDto) => (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          v{row.activeVersionNumber || 1}
        </Badge>
      ),
    },
    {
      key: "isActive",
      title: "وضعیت",
      label: "وضعیت",
      type: "custom",
      render: (_, row: ProcessDto) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "فعال" : "غیرفعال"}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "عملیات",
      label: "عملیات",
      type: "custom",
      render: (_, row: ProcessDto) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          onClick={() => router.push(`/workflow/designer/${row.id}`)}
        >
          <Activity className="w-4 h-4 ml-1" /> طراحی مراحل
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" /> طراح گردش کار
            (Workflow Builder)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت و طراحی فرآیندهای تایید و ارجاع سیستم
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> ایجاد فرآیند جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* 🌟 اصلاح نهایی: حذف searchPlaceholder که در DataTable تعریف نشده بود */}
          <DataTable
            {...tableProps}
            columns={columns}
            permissions={{ edit: false, delete: false }}
          />
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ایجاد فرآیند گردش کار جدید</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="processCode">کد فرآیند (لاتین و منحصربفرد)</Label>
              <Input
                id="processCode"
                placeholder="مثال: HR_LEAVE_V1"
                value={newProcess.processCode}
                onChange={(e) =>
                  setNewProcess({
                    ...newProcess,
                    processCode: e.target.value.toUpperCase(),
                  })
                }
                className="font-mono text-left"
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">عنوان فرآیند</Label>
              <Input
                id="title"
                placeholder="مثال: فرآیند تایید مرخصی پرسنل"
                value={newProcess.title}
                onChange={(e) =>
                  setNewProcess({ ...newProcess, title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetEntity">موجودیت هدف (Target Entity)</Label>
              <Input
                id="targetEntity"
                placeholder="مثال: LeaveRequestHeader"
                value={newProcess.targetEntityName}
                onChange={(e) =>
                  setNewProcess({
                    ...newProcess,
                    targetEntityName: e.target.value,
                  })
                }
                className="font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button onClick={handleCreateProcess} disabled={isSubmitting}>
              {isSubmitting ? "در حال ثبت..." : "ذخیره و ادامه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
