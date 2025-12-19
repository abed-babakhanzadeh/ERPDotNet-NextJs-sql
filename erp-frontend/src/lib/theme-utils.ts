export const hexToHsl = (hex: string): string => {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 100%"; // رنگ سفید پیش‌فرض در صورت خطا

  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);

  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // خاکستری/بی‌رنگ
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // خروجی استاندارد Shadcn (بدون پرانتز و hsl)
  return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
};

// لیست متغیرهایی که کاربر می‌تواند تغییر دهد
export const themeVariables = [
  { name: "--background", label: "Background" },
  { name: "--foreground", label: "Foreground" },
  { name: "--card", label: "Card Background" },
  { name: "--card-foreground", label: "Card Text" },
  { name: "--popover", label: "Popover Background" },
  { name: "--popover-foreground", label: "Popover Text" },
  { name: "--primary", label: "Primary Color" },
  { name: "--primary-foreground", label: "Primary Text" },
  { name: "--secondary", label: "Secondary Color" },
  { name: "--secondary-foreground", label: "Secondary Text" },
  { name: "--muted", label: "Muted Background" },
  { name: "--muted-foreground", label: "Muted Text" },
  { name: "--accent", label: "Accent Background" },
  { name: "--accent-foreground", label: "Accent Text" },
  { name: "--destructive", label: "Destructive" },
  { name: "--destructive-foreground", label: "Destructive Text" },
  { name: "--border", label: "Border" },
  { name: "--input", label: "Input Border" },
  { name: "--ring", label: "Focus Ring" },
];

export type ThemeConfig = Record<string, string>;