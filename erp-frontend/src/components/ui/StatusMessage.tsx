import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning/15 text-warning  ",
  danger: "bg-destructive/15 text-destructive  ",
};

interface StatusMessageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** جزئیات فنی کوچک، مثل کد پیگیری یا نام مجوز (قابل انتخاب و کپی) */
  detail?: string;
  tone?: Tone;
  /** دکمه‌های اقدام (مثلاً «تلاش دوباره») */
  actions?: React.ReactNode;
  className?: string;
}

/** حالت یکسان برای خطا، عدم دسترسی و صفحه یافت‌نشده در کل برنامه */
export function StatusMessage({
  icon: Icon,
  title,
  description,
  detail,
  tone = "neutral",
  actions,
  className,
}: StatusMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center",
        className,
      )}
    >
      <div className={cn("rounded-full p-4", toneStyles[tone])}>
        <Icon className="h-8 w-8" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
        {detail && (
          <p className="select-all font-mono text-xs text-muted-foreground" dir="ltr">
            {detail}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
