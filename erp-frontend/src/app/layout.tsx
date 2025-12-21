import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { CustomThemeProvider } from "@/providers/CustomThemeProvider";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { PermissionProvider } from "@/providers/PermissionProvider";
import { TabsProvider } from "@/providers/TabsProvider";
import { FontProvider } from "@/providers/FontProvider"; // اضافه شدن FontProvider

export const metadata: Metadata = {
  title: "ERP System",
  description: "سیستم جامع مدیریت منابع سازمانی",
};

// کد تولید UUID برای محیط‌های بدون HTTPS
if (
  typeof window !== "undefined" &&
  typeof window.crypto !== "undefined" &&
  typeof window.crypto.randomUUID === "undefined"
) {
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
      {/* نکته مهم: کلاس font-sans حذف شد تا فونت کاستوم اعمال شود */}
      <body className="bg-background text-foreground antialiased overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "custom"]}
        >
          <CustomThemeProvider>
            <FontProvider> {/* اضافه شدن دربرگیرنده فونت */}
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
            </FontProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}