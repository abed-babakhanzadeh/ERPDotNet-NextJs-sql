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
} from "lucide-react";
import { Database, Ruler } from "lucide-react";

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
    icon: LayoutDashboard,
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
];
