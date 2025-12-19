"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Printer, Download, Network, Box, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BOMTreeTable, { BOMTreeNodeDto } from "@/components/bom/BOMTreeTable";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 1. ایمپورت لایوت جدید
import BaseListLayout from "@/components/layout/BaseListLayout";

export default function BOMTreePage() {
  const params = useParams();
  const id = Number(params.id);

  const [data, setData] = useState<BOMTreeNodeDto | null>(null);
  const [loading, setLoading] = useState(true);

  // نکته: state مربوط به isFullscreen حذف شد چون لایوت آن را مدیریت می‌کند

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(`/BOMs/${id}/tree`);
        setData(res.data);
      } catch (error) {
        toast.error("خطا در دریافت ساختار درختی");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.info("قابلیت دانلود به زودی اضافه می‌شود");
  };

  if (loading) {
    return <TreeSkeleton />;
  }

  if (!data) {
    return (
      <BaseListLayout title="ساختار درختی محصول" icon={Network}>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <Layers size={48} className="opacity-20" />
          <p className="text-lg font-semibold">اطلاعاتی یافت نشد</p>
        </div>
      </BaseListLayout>
    );
  }

  // 2. تعریف دکمه‌های اکشن برای هدر
  const headerActions = (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 bg-background border-dashed text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs">دانلود</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>دانلود اکسل</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 bg-background border-dashed text-muted-foreground hover:text-foreground"
            >
              <Printer className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs">چاپ</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>چاپ ساختار</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );

  return (
    // 3. استفاده از لایوت استاندارد
    <BaseListLayout
      title="ساختار درختی محصول"
      icon={Network}
      actions={headerActions}
    >
      <div className="flex flex-col h-full gap-3 p-2 sm:p-4">
        {/* اینفو بار: نمایش اطلاعات محصول (جایگزین اطلاعات هدر قبلی) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md text-purple-600 dark:text-purple-400">
              <Box size={20} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">
                {data.productName}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>Code:</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {data.productCode}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            نمایش تا ۱۰ سطح
          </div>
        </div>

        {/* جدول درختی */}
        <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
          <BOMTreeTable data={data} />
        </div>
      </div>
    </BaseListLayout>
  );
}

function TreeSkeleton() {
  // اسکلتون را هم داخل لایوت می‌گذاریم تا هدر نمایش داده شود
  return (
    <BaseListLayout title="ساختار درختی محصول" icon={Network}>
      <div className="p-4 space-y-4 h-full">
        <div className="rounded-xl border bg-card p-4 h-20 animate-pulse" />
        <div className="flex-1 rounded-xl border bg-card p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </BaseListLayout>
  );
}
