"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ThemeConfig, hexToHsl } from "@/lib/theme-utils";

interface CustomThemeContextType {
  customTheme: ThemeConfig;
  updateVariable: (variable: string, hexColor: string) => void;
  loadTheme: (theme: ThemeConfig) => void;
  resetTheme: () => void;
  isActive: boolean;
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();
  const [customTheme, setCustomTheme] = useState<ThemeConfig>({});
  const [mounted, setMounted] = useState(false);

  // لود کردن از حافظه مرورگر در شروع کار
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("erp-custom-theme");
    if (saved) {
      try {
        setCustomTheme(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom theme", e);
      }
    }
  }, []);

  // تزریق استایل‌ها وقتی تم روی custom است
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === 'custom') {
        Object.entries(customTheme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    } else {
        // پاکسازی استایل‌ها اگر از حالت کاستوم خارج شدیم
        Object.keys(customTheme).forEach((key) => {
            root.style.removeProperty(key);
        });
    }

  }, [customTheme, theme, mounted]);

  const updateVariable = (variable: string, hexColor: string) => {
    const hslValue = hexToHsl(hexColor);
    const newTheme = { ...customTheme, [variable]: hslValue };
    setCustomTheme(newTheme);
    localStorage.setItem("erp-custom-theme", JSON.stringify(newTheme));
  };

  const loadTheme = (newTheme: ThemeConfig) => {
    setCustomTheme(newTheme);
    localStorage.setItem("erp-custom-theme", JSON.stringify(newTheme));
  };

  const resetTheme = () => {
    setCustomTheme({});
    localStorage.removeItem("erp-custom-theme");
    window.location.reload(); 
  };

  return (
    <CustomThemeContext.Provider value={{ 
        customTheme, 
        updateVariable, 
        loadTheme, 
        resetTheme,
        isActive: theme === 'custom' 
    }}>
      {children}
    </CustomThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext);
  if (!context) throw new Error("useCustomTheme must be used within a CustomThemeProvider");
  return context;
};