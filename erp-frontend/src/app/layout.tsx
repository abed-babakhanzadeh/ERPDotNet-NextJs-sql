import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { CustomThemeProvider } from "@/providers/CustomThemeProvider";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { PermissionProvider } from "@/providers/PermissionProvider";
import { TabsProvider } from "@/providers/TabsProvider";

export const metadata: Metadata = {
  title: "ERP System",
  description: "سیستم جامع مدیریت منابع سازمانی",
};

// --- این قطعه کد را اضافه کنید ---
if (
  typeof window !== "undefined" &&
  typeof window.crypto !== "undefined" &&
  typeof window.crypto.randomUUID === "undefined"
) {
  // اگر مرورگر این تابع را نداشت (چون روی HTTP هستیم)، ما یک نسخه دستی برایش می‌سازیم
  window.crypto.randomUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    ) as `${string}-${string}-${string}-${string}-${string}`;
  };
}
// -------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className="bg-background text-foreground antialiased font-sans overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "custom"]}
        >
          <CustomThemeProvider>
            <PermissionProvider>
              <TabsProvider>
                <div className="h-screen w-screen overflow-hidden">
                  {children}
                </div>

                {/* ابزارهای شناور */}
                <ThemeCustomizer />
                <Toaster
                  position="top-center"
                  richColors
                  closeButton
                  toastOptions={{
                    className: "text-xs",
                    duration: 3000,
                  }}
                />
              </TabsProvider>
            </PermissionProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
