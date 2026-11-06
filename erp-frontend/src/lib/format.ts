const faDate = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
const faLongDate = new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const faNumber = new Intl.NumberFormat("fa-IR");

/** تاریخ شمسی کوتاه (۱۴۰۴/۰۸/۰۳)؛ ورودی نامعتبر «—» */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : faDate.format(d);
}

/** تاریخ شمسی کامل با نام روز (یکشنبه ۳ آبان ۱۴۰۴) */
export function formatLongDate(value: Date) {
  // ترتیب را خودمان می‌سازیم؛ خروجی ICU برای fa-IR ویرگول لاتین و ترتیب نامرتب دارد
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    faLongDate.formatToParts(value).find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")} ${part("year")}`;
}

const faTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false });

/** تاریخ و ساعت شمسی (۱۴۰۵/۰۸/۰۶ - ۱۰:۳۰)؛ ورودی نامعتبر «—» */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : `${faDate.format(d)} - ${faTime.format(d)}`;
}

export function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : faNumber.format(value);
}

const groupedNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

/**
 * عدد با جداکننده هزارگان و ارقام لاتین در متن صفحه (۱۲۳۴ → 1,234).
 * شکل ارقام (فارسی/لاتین) را فونت طبق تنظیم کاربر نشان می‌دهد؛ متن کپی‌شده در Excel عدد می‌ماند.
 * برای جدول‌ها و داده‌های عددی؛ formatNumber فقط برای متن‌های نمایشی فارسی.
 */
export function formatGroupedNumber(value: number | null | undefined) {
  return value == null ? "—" : groupedNumber.format(value);
}
