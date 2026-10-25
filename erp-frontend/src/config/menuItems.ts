import {
  LayoutDashboard,
  Barcode,
  FolderTree,
  Users,
  Settings,
  Shield,
  Layers,
  Package,
  Wrench,
  ListTree,
  FilePlus,
  ClipboardList,
  Database,
  Ruler,
  // --- آیکون‌های جدید برای انبار ---
  Warehouse,
  Box,
  FileType,
  FileText,
  BarChart3,
  Activity,
  ScrollText,
  Inbox,
  Briefcase,
  Network,
  Settings2,
  Building2,
  CalendarRange,
  Coins,
} from "lucide-react";

export interface MenuItem {
  title: string;
  href?: string;
  icon: any;
  permission?: string;
  submenu?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    title: "داشبورد",
    href: "/",
    icon: LayoutDashboard,
  },

  // =======================================================
  // === ماژول گردش کار (Workflow) ===
  // =======================================================
  {
    title: "گردش کار",
    icon: Network,
    permission: "Workflow",
    submenu: [
      {
        title: "کارتابل من",
        href: "/workflow/inbox",
        icon: Inbox,
        permission: "Workflow.Tasks.Inbox",
      },
      {
        title: "طراح گردش کار",
        href: "/workflow/designer",
        icon: Settings2,
        permission: "Workflow.Processes.View",
      },
    ],
  },

  // === گروه عمومی ===
  {
    title: "عمومی",
    icon: Layers,
    permission: "General",
    submenu: [
      {
        title: "مدیریت کاربران",
        href: "/users",
        icon: Users,
        permission: "UserAccess",
      },
      {
        title: "مدیریت نقش‌ها",
        href: "/roles",
        icon: Shield,
        permission: "UserAccess.Roles",
      },
      {
        title: "تنظیمات",
        // href: "/settings",
        icon: Settings,
        permission: "General.Settings",
      },
    ],
  },

  // === گروه اطلاعات پایه ===
  {
    title: "اطلاعات پایه",
    icon: Database,
    permission: "BaseInfo",
    submenu: [
      {
        title: "واحد سنجش",
        href: "/base-info/units",
        icon: Ruler,
        permission: "BaseInfo.Units",
      },
      {
        title: "مدیریت کالاها",
        href: "/base-info/products",
        icon: Package,
        permission: "BaseInfo.Products",
      },
      {
        title: "شرکت‌ها",
        href: "/base-info/companies",
        icon: Building2,
        permission: "BaseInfo.Companies",
      },
      {
        title: "سال‌های مالی",
        href: "/base-info/fiscal-years",
        icon: CalendarRange,
        permission: "BaseInfo.FiscalYears",
      },
      {
        title: "گروه‌های کالا",
        href: "/base-info/product-categories",
        icon: FolderTree,
        permission: "BaseInfo.ProductCategories",
      },
      {
        title: "مراکز هزینه",
        href: "/base-info/cost-centers",
        icon: Coins,
        permission: "BaseInfo.CostCenters",
      },
    ],
  },

  // === مهندسی محصول (۳ سطحی) ===
  {
    title: "مهندسی محصول",
    icon: Wrench,
    permission: "ProductEngineering",
    submenu: [
      {
        // سطح دوم: مدیریت BOM (خودش لینک ندارد، فقط باز می‌شود)
        title: "مدیریت BOM",
        icon: ListTree,
        permission: "ProductEngineering.BOM",
        // href را حذف کردم چون این آیتم پدری برای گزینه‌های زیر است
        submenu: [
          // سطح سوم: آیتم‌های داخلی
          {
            title: "لیست BOMها",
            href: "/product-engineering/boms",
            icon: FilePlus,
            permission: "ProductEngineering.BOM.Create",
          },
        ],
      },

      {
        title: "گزارش ها",
        // href: "/base-info/products",
        icon: Package,
        permission: "BaseInfo.Products",
        submenu: [
          {
            title: "گزارش مصرف مواد",
            href: "/product-engineering/reports/where-used",
            icon: ClipboardList,
            permission: "ProductEngineering.BOM.Reports",
          },
        ],
      },
    ],
  },

  // =======================================================
  // === ماژول مدیریت انبار (اضافه شده) ===
  // =======================================================
  {
    title: "مدیریت انبار",
    icon: Warehouse,
    permission: "Inventory",
    submenu: [
      // 1. اطلاعات پایه انبار
      {
        title: "اطلاعات پایه",
        icon: Settings,
        permission: "Inventory.BaseInfo",
        submenu: [
          {
            title: "تعریف انبارها",
            href: "/inventory/warehouses",
            icon: Box,
            permission: "Inventory.Warehouses",
          },
          {
            title: "انواع سند",
            href: "/inventory/doc-types",
            icon: FileType,
            permission: "Inventory.DocTypes",
          },
        ],
      },

      // 2. عملیات انبار
      {
        title: "عملیات انبار",
        icon: ClipboardList,
        permission: "Inventory.Operations",
        submenu: [
          {
            title: "اسناد انبار",
            href: "/inventory/docs",
            icon: FileText,
            permission: "Inventory.Docs",
          },
        ],
      },

      // 3. گزارشات
      {
        title: "گزارشات",
        icon: BarChart3,
        permission: "Inventory.Reports",
        submenu: [
          {
            title: "موجودی لحظه‌ای",
            href: "/inventory/reports/current-stock",
            icon: Activity,
            permission: "Inventory.Reports.CurrentStock",
          },
          {
            title: "کاردکس کالا",
            href: "/inventory/reports/cardex",
            icon: ScrollText,
            permission: "Inventory.Reports.Cardex",
          },
          {
            title: "شماره سریال‌ها",
            href: "/inventory/reports/serials",
            icon: Barcode,
            permission: "Inventory.Reports.Serials",
          },
        ],
      },
    ],
  },
];

/**
 * مسیر منو (والدها تا آیتم) برای یک آدرس؛ طولانی‌ترین href منطبق برنده است
 * تا صفحه‌های فرزند مثل /inventory/docs/edit/5 هم عنوان «اسناد انبار» بگیرند.
 */
export function findMenuTrail(pathname: string, items: MenuItem[] = MENU_ITEMS): MenuItem[] {
  let best: MenuItem[] = [];
  const walk = (nodes: MenuItem[], trail: MenuItem[]) => {
    for (const node of nodes) {
      const next = [...trail, node];
      const href = node.href;
      if (href) {
        const matches = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        if (matches && href.length > (best.at(-1)?.href?.length ?? -1)) best = next;
      }
      if (node.submenu) walk(node.submenu, next);
    }
  };
  walk(items, []);
  return best;
}
