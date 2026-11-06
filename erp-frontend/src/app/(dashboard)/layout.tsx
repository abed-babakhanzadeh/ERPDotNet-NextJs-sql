import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-state";

/**
 * حالت باز/بسته منو را از کوکی (ذخیره‌شده توسط SidebarProvider) در سرور می‌خواند
 * تا صفحه بعد از رفرش بدون پرش با همان حالت قبلی کاربر رندر شود.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return <DashboardShell defaultSidebarOpen={defaultSidebarOpen}>{children}</DashboardShell>;
}
