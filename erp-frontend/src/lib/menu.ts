import { MENU_ITEMS, type MenuItem } from "@/config/menuItems";

/** یکسان‌سازی متن برای جستجو: ي/ك عربی، نیم‌فاصله و حروف بزرگ/کوچک */
export function normalizeSearchText(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .toLowerCase()
    .trim();
}

/** منو را بر اساس دسترسی و عبارت جستجو فیلتر می‌کند (والد با فرزند منطبق حفظ می‌شود) */
export function filterMenu(
  items: MenuItem[],
  query: string,
  hasPermission: (permission: string) => boolean,
): MenuItem[] {
  const q = normalizeSearchText(query);
  const walk = (nodes: MenuItem[]): MenuItem[] =>
    nodes.flatMap((item) => {
      if (item.permission && !hasPermission(item.permission)) return [];
      const submenu = item.submenu ? walk(item.submenu) : undefined;
      const matches =
        !q || normalizeSearchText(item.title).includes(q) || !!submenu?.length;
      return matches ? [{ ...item, submenu }] : [];
    });
  return walk(items);
}

export interface MenuLink {
  title: string;
  href: string;
  icon: MenuItem["icon"];
  /** عنوان والدها برای نمایش مسیر، مثل «انبار › اسناد» */
  section: string;
}

/** آیتم‌های قابل باز شدن (دارای href) را به صورت لیست تخت برمی‌گرداند */
export function flattenMenu(items: MenuItem[], parents: string[] = []): MenuLink[] {
  return items.flatMap((item) => {
    const own: MenuLink[] = item.href
      ? [{ title: item.title, href: item.href, icon: item.icon, section: parents.join(" › ") }]
      : [];
    const children = item.submenu
      ? flattenMenu(item.submenu, [...parents, item.title])
      : [];
    return [...own, ...children];
  });
}

/** عنوان مناسب برای یک مسیر: آیتم منو با طولانی‌ترین پیشوند منطبق (به جز ریشه) */
export function findMenuTitleForPath(pathname: string): string | null {
  let best: MenuLink | null = null;
  for (const link of flattenMenu(MENU_ITEMS)) {
    if (link.href === "/") continue;
    const matches = pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (matches && (!best || link.href.length > best.href.length)) best = link;
  }
  return best?.title ?? null;
}

/** فقط مسیرهای داخلی برنامه مجازند (جلوگیری از هدایت به دامنه دیگر با داده دستکاری‌شده) */
export function isInternalPath(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
}
