"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, SearchX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MENU_ITEMS } from "@/config/menuItems";
import { filterMenu, flattenMenu, type MenuLink } from "@/lib/menu";
import { usePermissions } from "@/providers/PermissionProvider";
import { HOME_PATH, useTabs } from "@/providers/TabsProvider";
import { cn } from "@/lib/utils";

/**
 * دکمه «+» نوار تب‌ها: جستجوی سریع بین صفحه‌های مجاز کاربر و باز کردن آن در تب جدید.
 * کیبورد: تایپ برای جستجو، بالا/پایین برای انتخاب، Enter برای باز کردن، Esc برای بستن.
 */
export function TabLauncher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const { hasPermission } = usePermissions();
  const { addTab } = useTabs();

  const links = useMemo(
    () =>
      flattenMenu(filterMenu(MENU_ITEMS, query, hasPermission)).filter(
        (l) => l.href !== HOME_PATH,
      ),
    [query, hasPermission],
  );

  const openLink = (link: MenuLink) => {
    setOpen(false);
    addTab(link.title, link.href);
  };

  const moveHighlight = (next: number) => {
    if (links.length === 0) return;
    const index = (next + links.length) % links.length;
    setHighlight(index);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(highlight + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(highlight - 1);
    } else if (e.key === "Enter" && links[highlight]) {
      e.preventDefault();
      openLink(links[highlight]);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setHighlight(0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="باز کردن صفحه در تب جدید"
          title="تب جدید"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0" dir="rtl">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="نام صفحه را بنویسید..."
            aria-label="جستجوی صفحه"
            className="h-8"
          />
        </div>
        {links.length === 0 ? (
          <div className="flex flex-col items-center gap-1 p-6 text-sm text-muted-foreground">
            <SearchX className="h-5 w-5" />
            صفحه‌ای با این نام پیدا نشد
          </div>
        ) : (
          <ul
            ref={listRef}
            role="listbox"
            aria-label="صفحه‌ها"
            className="custom-scrollbar max-h-80 overflow-y-auto p-1"
          >
            {links.map((link, index) => (
              <li
                key={link.href}
                role="option"
                aria-selected={index === highlight}
                data-index={index}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => openLink(link)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                  index === highlight && "bg-accent text-accent-foreground",
                )}
              >
                {link.icon && <link.icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="truncate">{link.title}</span>
                {link.section && (
                  <span className="ms-auto truncate text-xs text-muted-foreground">
                    {link.section}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
