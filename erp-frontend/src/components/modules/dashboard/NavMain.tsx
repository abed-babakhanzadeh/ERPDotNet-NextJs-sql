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

  // منطق باز بودن منو: اگر سرچ داریم یا اکتیو است
  const isOpen =
    (!!searchQuery && item.submenu && item.submenu.length > 0) || isActive;

  const handleClick = (e: React.MouseEvent) => {
    // 1. اگر سایدبار بسته است، بازش کن
    if (state === "collapsed") {
      setOpen(true);
      // اگر زیرمنو دارد، دیگر ادامه نده تا کاربر بتواند زیرمنو را ببیند
      if (item.submenu) {
        e.preventDefault();
        return;
      }
    }

    if (item.href) {
      e.preventDefault();
      addTab(item.title, item.href);

      // 2. بستن سایدبار بعد از کلیک (هم در موبایل هم دسکتاپ طبق درخواست شما)
      if (isMobile) {
        setOpenMobile(false);
      } else {
        // اگر می‌خواهید در دسکتاپ هم بسته شود:
        setOpen(false);
      }
    }
  };

  if (item.submenu && item.submenu.length > 0) {
    return (
      <Collapsible
        asChild
        defaultOpen={isOpen} // حالت اولیه
        open={isOpen ? true : undefined} // اجبار به باز بودن هنگام سرچ
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
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              <ChevronRight className="mr-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
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
        className={cn(
          isActive &&
            "font-semibold text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary"
        )}
      >
        <a href={item.href || "#"}>
          {item.icon ? <item.icon /> : <Circle className="size-2 opacity-50" />}
          <span>{item.title}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
