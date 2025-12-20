"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Circle } from "lucide-react";
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";
import { MenuItem } from "@/config/menuItems";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavMainProps {
  items: MenuItem[];
  searchQuery: string;
}

export function NavMain({ items, searchQuery }: NavMainProps) {
  const { hasPermission } = usePermissions();

  const filterItems = (nodes: MenuItem[]): MenuItem[] => {
    return nodes
      .filter((item) => {
        const access = item.permission ? hasPermission(item.permission) : true;
        if (!access) return false;
        if (!searchQuery) return true;
        const matchesSelf = item.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const hasMatchingChildren = item.submenu
          ? filterItems(item.submenu).length > 0
          : false;
        return matchesSelf || hasMatchingChildren;
      })
      .map((item) => ({
        ...item,
        submenu: item.submenu ? filterItems(item.submenu) : undefined,
      }));
  };

  const filteredItems = filterItems(items);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>ماژول‌ها</SidebarGroupLabel>
      <SidebarMenu>
        {filteredItems.map((item) => (
          <NavParamsItem
            key={item.title}
            item={item}
            searchQuery={searchQuery}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavParamsItem({
  item,
  searchQuery,
}: {
  item: MenuItem;
  searchQuery: string;
}) {
  const pathname = usePathname();
  const { addTab } = useTabs();
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();

  const isActive =
    item.href === pathname ||
    item.submenu?.some((sub) => sub.href === pathname);

  const isOpen =
    (!!searchQuery && item.submenu && item.submenu.length > 0) || isActive;

  const handleClick = (e: React.MouseEvent) => {
    if (state === "collapsed") {
      setOpen(true);
      if (item.submenu) {
        e.preventDefault();
        return;
      }
    }

    if (item.href) {
      e.preventDefault();
      addTab(item.title, item.href);
      if (isMobile) {
        setOpenMobile(false);
      } else {
        setOpen(false);
      }
    }
  };

  // --- استایل‌های اصلاح شده ---
  const menuItemClass = cn(
    // بیس: ارتفاع مناسب و انیمیشن
    "relative overflow-hidden transition-all duration-200 ease-in-out h-10 mb-1",

    // بوردر و سایه (درخواست قبلی)
    "border-b border-sidebar-border/40 shadow-[0_1px_1px_rgba(0,0,0,0.02)]",

    // *** اصلاح هاور (درخواست جدید) ***
    // 1. رنگ پس‌زمینه مشخص‌تر: bg-primary/5 (نه sidebar-accent که شاید بی‌رنگ باشد)
    // 2. رنگ متن: text-primary (رنگ اصلی برند)
    // 3. حرکت: حفظ شد
    "hover:bg-primary/5 hover:text-primary hover:shadow-sm hover:-translate-x-1",

    // حالت فعال (Active)
    isActive
      ? "font-semibold text-primary bg-primary/10 border-b-primary/20 shadow-none"
      : "text-muted-foreground"
  );

  if (item.submenu && item.submenu.length > 0) {
    return (
      <Collapsible
        asChild
        defaultOpen={isOpen}
        open={isOpen ? true : undefined}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isActive}
              onClick={(e) => {
                if (state === "collapsed") {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
              className={menuItemClass}
            >
              {item.icon && <item.icon className="shrink-0" />}
              <span className="truncate flex-1 text-right" title={item.title}>
                {item.title}
              </span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90 opacity-50" />
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {/* *** اصلاح تورفتگی (Indentation Fix) ***
               - mr-3.5: فاصله از راست (نه چپ) برای ایجاد پله در RTL
               - border-r: خط درختی در سمت راست
               - pr-2: فاصله محتوا از خط
            */}
            <SidebarMenuSub className="mr-3.5 border-r border-sidebar-border/60 pr-2 border-l-0 ml-0">
              {item.submenu.map((subItem) => (
                <NavParamsItem
                  key={subItem.title}
                  item={subItem}
                  searchQuery={searchQuery}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        onClick={handleClick}
        className={menuItemClass}
      >
        <a href={item.href || "#"}>
          {item.icon ? (
            <item.icon className="shrink-0" />
          ) : (
            // آیکون دایره برای زیرمنوها، کمی کوچک‌تر و کم‌رنگ‌تر
            <Circle className="size-1.5 opacity-60 shrink-0" />
          )}
          <span className="truncate w-full text-right block" title={item.title}>
            {item.title}
          </span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
