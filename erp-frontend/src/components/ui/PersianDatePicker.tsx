"use client";

import React from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { CalendarIcon, X, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PersianDatePickerProps {
  value?: string | Date | null;
  onChange: (date: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  hasError?: boolean;
}

export default function PersianDatePicker({
  value,
  onChange,
  label,
  placeholder = "انتخاب تاریخ...",
  disabled = false,
  required = false,
  className,
  hasError,
}: PersianDatePickerProps) {
  // رفرنس برای کنترل تقویم (بستن بعد از انتخاب امروز)
  const datePickerRef = React.useRef<any>(null);

  const dateValue = React.useMemo(() => {
    if (!value) return null;
    return new Date(value.toString());
  }, [value]);

  const handleChange = (date: DateObject | DateObject[] | null) => {
    if (!date) {
      onChange(null);
      return;
    }
    if (date instanceof DateObject) {
      // تبدیل به ISO String (تایم روی 12 ظهر برای جلوگیری از شیفت زمانی)
      date.setHour(12);
      onChange(date.toDate().toISOString());
    }
  };

  // --- پلاگین دکمه "امروز" ---
  const TodayPlugin: React.FC<{ position?: string }> = () => {
    return (
      <div className="flex justify-center p-2 border-t mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
          onClick={() => {
            const today = new DateObject({
              calendar: persian,
              locale: persian_fa,
            });
            handleChange(today); // ست کردن مقدار
            datePickerRef.current?.closeCalendar(); // بستن تقویم
          }}
        >
          <CalendarCheck className="w-3 h-3" />
          برو به امروز
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("relative w-full", className)}>
      <DatePicker
        ref={datePickerRef}
        value={dateValue}
        onChange={handleChange}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        disabled={disabled}
        editable={false}
        containerClassName="w-full"
        // اضافه کردن پلاگین دکمه امروز
        plugins={[<TodayPlugin key="today-plugin" position="bottom" />]}
        render={(value: any, openCalendar: any) => {
          return (
            <div
              onClick={!disabled ? openCalendar : undefined}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer transition-colors",
                disabled && "cursor-not-allowed opacity-50 bg-muted",
                hasError && "border-destructive ring-destructive",
                !value && "text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                <span className="truncate pt-1 font-medium">
                  {value || placeholder}
                </span>
              </div>

              {!disabled && value && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="hover:bg-muted rounded-full p-1 transition-colors"
                >
                  <X className="h-3 w-3 opacity-50" />
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
