"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// تغییر مهم: استفاده از ComponentProps برای استخراج تایپ
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
