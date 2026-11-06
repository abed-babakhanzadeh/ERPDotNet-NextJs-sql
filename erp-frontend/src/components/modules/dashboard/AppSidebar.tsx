"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Command, LayoutGrid, Search } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"; // مسیر فایل shadcn sidebar که آپلود کردید
import { NavMain } from "./NavMain"; // کامپوننت جدید که پایین‌تر می‌سازیم
import { NavUser } from "./NavUser"; // کامپوننت جدید پروفایل
import { MENU_ITEMS } from "@/config/menuItems";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// می‌توانید لوگوی شرکت خود را اینجا قرار دهید
function TeamSwitcher() {
  const { state } = useSidebar();

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LayoutGrid className="size-4" />
      </div>
      {state === "expanded" && (
        <div className="grid flex-1 text-right leading-tight">
          <span className="truncate font-semibold">سامانه ERP</span>
          <span className="truncate text-xs text-muted-foreground">
            نسخه سازمانی
          </span>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { state, setOpen } = useSidebar();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [focusSearchOnOpen, setFocusSearchOnOpen] = React.useState(false);

  // بعد از باز شدن منو با دکمه جستجو، فوکوس به فیلد جستجو می‌رود
  React.useEffect(() => {
    if (state === "expanded" && focusSearchOnOpen) {
      searchRef.current?.focus();
      setFocusSearchOnOpen(false);
    }
  }, [state, focusSearchOnOpen]);

  return (
    <Sidebar role="navigation" aria-label="منوی اصلی" collapsible="icon" side="right" variant="sidebar" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
        {/* منوی جمع‌شده: جستجو به‌صورت آیکون؛ کلیک منو را باز و فیلد جستجو را فوکوس می‌کند */}
        {state === "collapsed" && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="جستجوی منو"
                aria-label="جستجوی منو"
                onClick={() => {
                  setFocusSearchOnOpen(true);
                  setOpen(true);
                }}
              >
                <Search />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {state === "expanded" && (
          <div className="px-2 relative">
            <div className="relative">
              <Search className="absolute right-2 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                placeholder="جستجوی منو..."
                aria-label="جستجوی منو"
                className="pr-8 h-9 bg-background shadow-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* رندر کردن منوها به صورت بازگشتی */}
        <NavMain items={MENU_ITEMS} searchQuery={searchQuery} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
