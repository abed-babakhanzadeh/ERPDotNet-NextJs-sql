"use client";

import * as React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * نقش دکمه در نوار بالای فرم/صفحه؛ رنگ از نقش می‌آید، نه از هر صفحه:
 * - `submit`: ثبت/ذخیره، تنها دکمه پررنگ سبز هر صفحه
 * - `primary`: اقدام اصلی وقتی ثبتی در کار نیست (ویرایش در حالت مشاهده، «جدید» در فهرست)، آبی پررنگ
 * - `accent`: اقدام رو به جلو کنار ثبت (ارسال برای تأیید)، حاشیه و متن آبی
 * - `secondary`: ابزارها (ساختار درختی، فراخوانی از الگو، چاپ)، خنثی
 * - `cancel`: انصراف/بازگشت، خنثی (قرمز فقط برای اقدام مخرب است)
 * - `danger`: حذف/ابطال، حاشیه و متن قرمز
 */
export type ToolbarIntent = "submit" | "primary" | "accent" | "secondary" | "cancel" | "danger";

const intentClass: Record<ToolbarIntent, { variant: React.ComponentProps<typeof Button>["variant"]; className?: string }> = {
  submit: { variant: "success" },
  primary: { variant: "default" },
  accent: { variant: "outline", className: "border-primary/40 text-primary hover:bg-primary/10 hover:text-primary" },
  secondary: { variant: "outline", className: "text-foreground" },
  cancel: { variant: "outline", className: "text-muted-foreground hover:text-foreground" },
  danger: { variant: "outline", className: "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" },
};

/**
 * ظاهر دکمه نوار ابزار برای جاهایی که خود Button لازم است (مثلاً trigger منوی کشویی با asChild)؛
 * همان اندازه و رنگ ToolbarButton، بدون tooltip داخلی.
 */
export function toolbarButtonStyle(intent: ToolbarIntent, className?: string) {
  const { variant, className: intentClassName } = intentClass[intent];
  return {
    variant,
    size: "sm" as const,
    className: cn("h-8 gap-1.5 px-2.5 text-xs sm:px-3", intentClassName, className),
  };
}

interface ToolbarButtonProps extends Omit<React.ComponentProps<typeof Button>, "children" | "variant" | "size"> {
  intent: ToolbarIntent;
  icon: LucideIcon;
  label: string;
  /** توضیح بیشتر در tooltip؛ پیش‌فرض همان label */
  tooltip?: string;
  /** حالت در حال انجام: اسپینر به جای آیکون و غیرفعال شدن دکمه */
  loading?: boolean;
  loadingLabel?: string;
}

/**
 * دکمه یکسان نوار ابزار بالای فرم‌ها و صفحه‌ها: اندازه، فاصله، آیکون و رنگ از یک جا.
 * در موبایل فقط آیکون نمایش داده می‌شود و برچسب در tooltip و برای صفحه‌خوان می‌ماند.
 * باید داخل یک TooltipProvider باشد (BaseFormLayout و BaseListLayout فراهم می‌کنند).
 */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    { intent, icon: Icon, label, tooltip, loading = false, loadingLabel, disabled, className, type = "button", ...props },
    ref,
  ) {
    const text = loading && loadingLabel ? loadingLabel : label;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type={type}
            {...toolbarButtonStyle(intent, className)}
            disabled={disabled || loading}
            aria-label={text}
            {...props}
          >
            {loading ? (
              <Loader2 className="h-[15px] w-[15px] animate-spin" aria-hidden />
            ) : (
              <Icon className="h-[15px] w-[15px]" aria-hidden />
            )}
            <span className="sr-only sm:not-sr-only">{text}</span>
          </Button>
        </TooltipTrigger>
        {/* در دسکتاپ برچسب دیده می‌شود؛ tooltip فقط وقتی توضیح بیشتری هست یا در موبایل */}
        <TooltipContent side="bottom" className={cn("text-xs", !tooltip && "sm:hidden")}>
          {tooltip ?? label}
        </TooltipContent>
      </Tooltip>
    );
  },
);

/**
 * دکمه فقط‌آیکون نوار ابزار (بروزرسانی، چاپ و ...)؛ برچسب در tooltip و برای صفحه‌خوان.
 * همان ارتفاع ToolbarButton تا ردیف دکمه‌ها هم‌تراز بماند.
 */
export const ToolbarIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<typeof Button>, "children" | "variant" | "size"> & {
    icon: LucideIcon;
    label: string;
    loading?: boolean;
  }
>(function ToolbarIconButton({ icon: Icon, label, loading = false, disabled, className, type = "button", ...props }, ref) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type={type}
          variant="outline"
          size="icon"
          aria-label={label}
          disabled={disabled || loading}
          className={cn("h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground", className)}
          {...props}
        >
          <Icon className={cn("h-[15px] w-[15px]", loading && "animate-spin")} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});

/** جداکننده عمودی بین گروه دکمه‌ها (مثلاً بین ابزارها و ثبت/انصراف) */
export function ToolbarSeparator() {
  return <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />;
}
