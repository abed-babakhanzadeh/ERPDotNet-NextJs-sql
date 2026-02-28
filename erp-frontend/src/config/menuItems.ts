import {
  LayoutDashboard,
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
    // href: "/",
    href: "/dashboard", // معمولا این مسیر درست است
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
        ],
      },
    ],
  },
];
