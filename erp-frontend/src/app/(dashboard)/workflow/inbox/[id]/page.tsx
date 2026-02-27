"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Loader2,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { workflowService } from "@/services/workflowService";
import inventoryService from "@/services/inventoryService";

// 🌟 ایمپورت کامپوننت فرم انبار
import DocForm from "@/app/(dashboard)/inventory/docs/components/DocForm";

export default function TaskDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>; // 🌟 2. تغییر نوع params به Promise
}) {
  const router = useRouter();
  // 🌟 3. باز کردن Promise با استفاده از use
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  // State های مربوط به گردش کار
  const [task, setTask] = useState<any>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  // State های مربوط به فرم بیزینسی (انبار)
  const [businessData, setBusinessData] = useState<any>(null);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  // 1. دریافت اطلاعات تسک از موتور BPMS
  useEffect(() => {
    workflowService
      .getTaskDetails(id)
      .then((data) => setTask(data))
      .catch(() => toast.error("خطا در دریافت اطلاعات پرونده"))
      .finally(() => setTaskLoading(false));
  }, [id]);

  // 2. دریافت اطلاعات فرم انبار به محض مشخص شدن ProcessCode
  useEffect(() => {
    if (task && task.processCode === "INVENTORY_V1") {
      setBusinessLoading(true);

      // فراخوانی همزمان دیتاهای مورد نیاز برای رندر شدن DocForm
      Promise.all([
        inventoryService.getDocById(task.targetRecordId),
        inventoryService.getAllDocTypes(),
        inventoryService.getAllWarehouses(),
      ])
        .then(([docRes, dtRes, wRes]) => {
          setBusinessData(docRes);
          setDocTypes(dtRes);
          setWarehouses(wRes);
        })
        .catch(() => {
          toast.error("خطا در دریافت جزئیات سند انبار از سرور");
        })
        .finally(() => {
          setBusinessLoading(false);
        });
    }
  }, [task]);

  // 3. هندلر کلیک روی دکمه‌های تایید/رد
  const handleTransition = async (transitionId: number) => {
    try {
      setProcessingId(transitionId);
      await workflowService.completeTask(task.taskId, {
        taskId: task.taskId,
        transitionId: transitionId,
        comment: comment || undefined,
      });

      toast.success("وظیفه با موفقیت انجام شد.");
      router.push("/workflow/inbox"); // برگشت به لیست کارتابل
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در انجام عملیات");
    } finally {
      setProcessingId(null);
    }
  };

  // رندر وضعیت لودینگ اولیه
  if (taskLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <p className="text-muted-foreground">در حال بارگذاری پرونده...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center p-12 text-gray-500">
        پرونده مورد نظر یافت نشد.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-[1400px] mx-auto">
      {/* 🌟 بخش هدر و پنل عملیات گردش کار */}
      <Card className="border-blue-100 shadow-sm bg-blue-50/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            {/* قسمت اطلاعات تسک */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/workflow/inbox")}
                >
                  <ArrowRight className="w-4 h-4 ml-1" /> بازگشت
                </Button>
                <h1 className="text-2xl font-bold text-slate-800">
                  {task.processTitle}
                </h1>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">اقدام مورد نیاز</p>
                  <p className="font-semibold flex items-center gap-1.5 text-slate-700">
                    <FileText className="w-4 h-4 text-blue-500" />{" "}
                    {task.taskTitle}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">مرحله فعلی پرونده</p>
                  <p className="font-semibold text-blue-600">
                    {task.stateTitle}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">شماره مرجع (دیتابیس)</p>
                  <p className="font-semibold">{task.targetRecordId}</p>
                </div>
              </div>
            </div>

            {/* قسمت دکمه‌های تایید و کامنت */}
            <div className="w-full md:w-[450px] border-t md:border-t-0 md:border-r border-blue-200 pt-6 md:pt-0 md:pr-8 flex flex-col">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                یادداشت / پاراف مدیر (اختیاری)
              </label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white mb-4 resize-none"
                rows={2}
                placeholder="دلایل تایید یا رد خود را بنویسید..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="flex flex-wrap gap-2 mt-auto">
                {task.availableTransitions.map((t: any) => {
                  const isReject =
                    t.actionTitle.includes("رد") ||
                    t.actionTitle.includes("برگشت");
                  return (
                    <Button
                      key={t.transitionId}
                      onClick={() => handleTransition(t.transitionId)}
                      disabled={processingId !== null}
                      variant={isReject ? "destructive" : "default"}
                      className="flex-1 font-bold shadow-sm"
                    >
                      {processingId === t.transitionId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isReject ? (
                        <XCircle className="ml-2 w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="ml-2 w-4 h-4" />
                      )}
                      {t.actionTitle}
                    </Button>
                  );
                })}
                {task.availableTransitions.length === 0 && (
                  <div className="w-full p-2 bg-red-50 text-red-600 text-sm text-center rounded-md border border-red-200">
                    دسترسی یا دکمه‌ای برای این مرحله تعریف نشده است.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🌟 بخش رندر هوشمند فرم‌های سیستم بر اساس ProcessCode */}
      <div className="w-full relative">
        {task.processCode === "INVENTORY_V1" ? (
          businessLoading ? (
            <div className="flex justify-center p-12 bg-white rounded-xl border">
              <Loader2 className="animate-spin text-primary w-8 h-8" />
              <span className="mr-3 text-slate-500">
                در حال دریافت محتوای سند انبار...
              </span>
            </div>
          ) : businessData ? (
            <div className="opacity-95 pointer-events-none-if-needed">
              {/* از DocForm در حالت view استفاده می‌کنیم تا فیلدها غیرقابل ویرایش باشند */}
              <DocForm
                mode="view"
                initialData={businessData}
                docTypes={docTypes}
                warehouses={warehouses}
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-red-50 text-red-500 rounded-lg border border-red-100">
              خطا در بارگذاری دیتای سند انبار! احتمالاً سند حذف شده است.
            </div>
          )
        ) : (
          <div className="p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500">
            طراحی فرم برای فرآیند <b>{task.processCode}</b> هنوز به کارتابل متصل
            نشده است.
          </div>
        )}
      </div>
    </div>
  );
}
