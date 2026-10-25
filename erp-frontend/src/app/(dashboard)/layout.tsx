"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/modules/dashboard/AppSidebar";
import TabsBar from "@/components/modules/dashboard/TabsBar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import AIChatWidget from "@/components/AIChatWidget";
import { PageHeading } from "@/components/modules/dashboard/PageHeading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <SidebarProvider defaultOpen={true} className="h-svh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[120] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        پرش به محتوای اصلی
      </a>
      <AppSidebar />

      <SidebarInset className="bg-background h-full flex flex-col overflow-hidden">
        {/* Header - ثابت در بالا */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-mr-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <PageHeading />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="اعلان‌ها"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* TabsBar - ثابت زیر هدر */}
        <div className="shrink-0 z-10 bg-background/95 backdrop-blur border-b shadow-sm">
          <TabsBar />
        </div>

        {/* Main Content */}
        {/* SidebarInset خودش <main> است؛ این ناحیه فقط مقصد «پرش به محتوا» است */}
        <div
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 focus:outline-none"
        >
          {children}
        </div>

        {/* ✅ محل دقیق اضافه کردن ویجت: اینجا، قبل از بسته شدن SidebarInset */}
        <AIChatWidget />
        
      </SidebarInset>
    </SidebarProvider>
  );
}