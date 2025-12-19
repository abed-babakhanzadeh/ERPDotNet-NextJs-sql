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
  // محتوای هدر: اگر شامل دکمه باشد، مسئولیت تکرار با والد است.
  // پیشنهاد: در اینجا فقط فیلدهای اطلاعاتی اصلی (Master) را بگذارید.
  headerContent: ReactNode;
  tabs: MasterDetailTab[];
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitting?: boolean;
  formId?: string;
  // این دکمه‌ها به هدر BaseLayout می‌روند
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
      // اگر دکمه‌های سفارشی دارید اینجا پاس دهید، در غیر این صورت BaseFormLayout دکمه‌های پیش‌فرض را نمایش می‌دهد
      headerActions={headerActions}
    >
      <div className="flex flex-col gap-3 h-full">
        {/* 1. Header Section */}
        {/* این بخش فقط باید شامل فیلدها باشد، نه دکمه‌های عملیات */}
        <div className="bg-card border rounded-lg p-3 shadow-sm" dir="rtl">
          {headerContent}
        </div>

        {/* 2. Details Section (Tabs) */}
        <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
          <Tabs
            defaultValue={tabs[0]?.key}
            className="flex flex-col h-full"
            dir="rtl"
          >
            <div className="border-b px-3 bg-muted/20">
              <TabsList className="bg-transparent h-10 p-0 gap-4 w-full justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                      {tab.label}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-0 bg-white dark:bg-zinc-950 custom-scrollbar">
              {tabs.map((tab) => (
                <TabsContent
                  key={tab.key}
                  value={tab.key}
                  className="h-full m-0 p-3 data-[state=inactive]:hidden"
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
