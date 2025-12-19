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
    // تغییر ۱: اضافه کردن h-svh و overflow-hidden برای قفل کردن ارتفاع کل صفحه به اندازه مرورگر
    <SidebarProvider defaultOpen={true} className="h-svh overflow-hidden">
      <AppSidebar />

      {/* تغییر ۲: SidebarInset باید تمام ارتفاع را پر کند و خودش فلکس ستونی باشد */}
      <SidebarInset className="bg-background h-full flex flex-col overflow-hidden">
        {/* Header - ثابت در بالا */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-mr-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-sm font-semibold text-muted-foreground hidden sm:block">
              پیشخوان سیستم
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 border border-background"></span>
            </Button>
          </div>
        </header>

        {/* TabsBar - ثابت زیر هدر */}
        <div className="shrink-0 z-10 bg-background/95 backdrop-blur border-b shadow-sm">
          <TabsBar />
        </div>

        {/* تغییر ۳ (مهم‌ترین بخش): 
            - flex-1: فضای باقیمانده را پر کند
            - overflow-y-auto: اسکرول عمودی فقط اینجا باشد
            - overflow-x-hidden: جلوگیری از اسکرول افقی کل صفحه (جدول باید اسکرول افقی داخلی داشته باشد)
            - min-h-0: حیاتی برای کار کردن اسکرول در فلکس‌باکس
        */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-muted/10 p-2 md:p-4">
          {/* کانتینر داخلی برای محتوا */}
          <div className="h-full w-full max-w-full">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
