"use client";

import React, { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BaseFormLayout from "@/components/layout/BaseFormLayout";

export interface MasterDetailTab {
  key: string;
  label: string;
  content: ReactNode;
  icon?: React.ElementType;
}

interface MasterDetailFormProps {
  title: string;
  headerContent: ReactNode;
  tabs: MasterDetailTab[];
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitting?: boolean;
  formId?: string;
  headerActions?: ReactNode;
}

export default function MasterDetailForm({
  title,
  headerContent,
  tabs,
  isLoading,
  onSubmit,
  onCancel,
  submitting,
  formId = "master-detail-form",
  headerActions,
}: MasterDetailFormProps) {
  return (
    <BaseFormLayout
      title={title}
      isLoading={isLoading}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={submitting}
      formId={formId}
      headerActions={headerActions}
    >
      {/* ✅ اصلاح ریسپانسیو: 
         - در موبایل: ارتفاع اتوماتیک (h-auto) تا صفحه اسکرول طبیعی داشته باشد.
         - در دسکتاپ (md): ارتفاع فیکس (h-full) برای پنل‌بندی.
      */}
      <div className="flex flex-col gap-3 h-auto md:h-full bg-background pb-16 md:pb-0">
        {/* 1. Header Section */}
        <div
          className="bg-card border rounded-lg p-3 shadow-sm shrink-0"
          dir="rtl"
        >
          {headerContent}
        </div>

        {/* 2. Details Section (Tabs) */}
        {/* در موبایل overflow-visible باشد تا اسکرول مرورگر کار کند */}
        <div className="flex-1 bg-card border rounded-lg shadow-sm flex flex-col min-h-[500px] md:min-h-0 md:overflow-hidden">
          <Tabs
            defaultValue={tabs[0]?.key}
            className="flex flex-col h-full"
            dir="rtl"
          >
            {/* Tab Header */}
            <div className="border-b px-3 bg-muted/20 shrink-0">
              <TabsList className="bg-transparent h-10 p-0 gap-4 w-full justify-start overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground transition-all whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                      {tab.label}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            {/* در موبایل اسکرول داخلی را حذف می‌کنیم تا با اسکرول اصلی صفحه یکی شود */}
            <div className="flex-1 p-0 bg-white dark:bg-zinc-950 flex flex-col md:overflow-hidden">
              {tabs.map((tab) => (
                <TabsContent
                  key={tab.key}
                  value={tab.key}
                  // در موبایل h-auto، در دسکتاپ flex-1 برای پر کردن فضا
                  className="h-auto md:flex-1 m-0 p-3 data-[state=inactive]:hidden flex flex-col min-h-0"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </div>
    </BaseFormLayout>
  );
}
