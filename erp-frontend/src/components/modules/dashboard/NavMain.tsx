"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Circle } from "lucide-react";
import { usePermissions } from "@/providers/PermissionProvider";
import { useTabs } from "@/providers/TabsProvider";
import { MenuItem } from "@/config/menuItems";
import { filterMenu, findMenuLinkForPath } from "@/lib/menu";
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
  const pathname = usePathname();
  const filteredItems = filterMenu(items, searchQuery, hasPermission);
  // صفحه فعلی؛ صفحه‌های جزئیات/ویرایش هم آیتم فهرست خود را فعال نشان می‌دهند
  const activeHref = findMenuLinkForPath(pathname)?.href ?? null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>ماژول‌ها</SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {filteredItems.map((item) => (
          <NavParamsItem
            key={item.title}
            item={item}
            searchQuery={searchQuery}
            activeHref={activeHref}
            depth={0}
          />
        ))}
      </SidebarMenu>
      {filteredItems.length === 0 && (
        <p role="status" className="px-2 py-6 text-center text-xs text-muted-foreground">
          موردی با «{searchQuery}» پیدا نشد
        </p>
      )}
    </SidebarGroup>
  );
}

const containsHref = (item: MenuItem, href: string | null): boolean =>
  !!href && (item.href === href || !!item.submenu?.some((sub) => containsHref(sub, href)));

function NavParamsItem({
  item,
  searchQuery,
  activeHref,
  depth,
}: {
  item: MenuItem;
  searchQuery: string;
  activeHref: string | null;
  /** سطح در درخت منو؛ زیرمنوها فشرده‌تر نمایش داده می‌شوند */
  depth: number;
}) {
  const { addTab } = useTabs();
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();

  const isCurrentPage = !!item.href && item.href === activeHref;
  const containsCurrentPage = containsHref(item, activeHref);

  const isOpen =
    (!!searchQuery && item.submenu && item.submenu.length > 0) || containsCurrentPage;

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

  // یک نشانگر فعال در کل منو: فقط صفحه جاری پس‌زمینه و نوار کناری (لبه شروع = راست در RTL) می‌گیرد؛
  // ماژول والدِ صفحه جاری فقط پررنگ‌تر می‌شود. بدون جابه‌جایی/سایه در hover (پرهیز از حرکت اضافه)
  const isSubItem = depth > 0;
  const menuItemClass = cn(
    "relative transition-colors",
    isSubItem ? "h-8 text-[13px]" : "h-9",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "data-[active=true]:bg-transparent data-[active=true]:font-normal",
    isCurrentPage
      ? cn(
          "!bg-primary/10 !font-medium !text-primary hover:!bg-primary/15",
          "before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-primary",
        )
      : containsCurrentPage
        ? "font-medium text-foreground [&>svg]:text-primary"
        : "text-muted-foreground",
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
              isActive={false}
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
            <SidebarMenuSub className="mr-3.5 gap-0.5 border-r border-sidebar-border pr-2 border-l-0 ml-0">
              {item.submenu.map((subItem) => (
                <NavParamsItem
                  key={subItem.title}
                  item={subItem}
                  searchQuery={searchQuery}
                  activeHref={activeHref}
                  depth={depth + 1}
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
        isActive={isCurrentPage}
        tooltip={item.title}
        onClick={handleClick}
        className={menuItemClass}
      >
        <a href={item.href || "#"} aria-current={isCurrentPage ? "page" : undefined}>
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
