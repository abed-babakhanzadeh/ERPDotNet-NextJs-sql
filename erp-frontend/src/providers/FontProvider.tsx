"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type FontType = "iransans" | "kharazmi";
type DigitType = "farsi" | "english";

interface FontContextType {
  font: FontType;
  setFont: (font: FontType) => void;
  digit: DigitType;
  setDigit: (digit: DigitType) => void;
  scale: number;
  setScale: (scale: number) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontType>("iransans");
  const [digit, setDigitState] = useState<DigitType>("farsi");
  const [scale, setScaleState] = useState<number>(100);

  useEffect(() => {
    const savedFont = localStorage.getItem("app-font") as FontType;
    const savedDigit = localStorage.getItem("app-digit") as DigitType;
    // خواندن مقدار ذخیره شده اسکیل، اگر نبود 100
    const savedScale = localStorage.getItem("app-scale");

    const initialFont = savedFont || "iransans";
    const initialDigit = savedDigit || "farsi";
    const initialScale = savedScale ? parseInt(savedScale) : 100;

    // اعمال اولیه
    applyConfiguration(initialFont, initialDigit);
    applyScale(initialScale);
  }, []);

  const applyConfiguration = (currentFont: FontType, currentDigit: DigitType) => {
    const root = document.documentElement;

    if (currentFont === "kharazmi") {
      if (currentDigit === "farsi") {
        root.style.setProperty("--font-body", "var(--font-kharazmi-fanum)");
      } else {
        root.style.setProperty("--font-body", "var(--font-kharazmi-ennum)");
      }
    } else {
      if (currentDigit === "farsi") {
        root.style.setProperty("--font-body", "var(--font-iransans-fanum)");
      } else {
        root.style.setProperty("--font-body", "var(--font-iransans-ennum)");
      }
    }
    setFontState(currentFont);
    setDigitState(currentDigit);
  };

  const applyScale = (newScale: number) => {
    const root = document.documentElement;
    // تغییر فونت سایز روت باعث می‌شود تمام واحدهای rem در پروژه تغییر کنند
    root.style.fontSize = `${newScale}%`; // 100% = 16px default
    setScaleState(newScale);
  };

  const setFont = (newFont: FontType) => {
    applyConfiguration(newFont, digit);
    localStorage.setItem("app-font", newFont);
  };

  const setDigit = (newDigit: DigitType) => {
    applyConfiguration(font, newDigit);
    localStorage.setItem("app-digit", newDigit);
  };

  const setScale = (newScale: number) => {
    // محدودیت بین 70 درصد تا 130 درصد برای جلوگیری از بهم ریختگی شدید
    if (newScale < 70 || newScale > 130) return;
    
    applyScale(newScale);
    localStorage.setItem("app-scale", newScale.toString());
  };

  return (
    <FontContext.Provider value={{ font, setFont, digit, setDigit, scale, setScale }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
};