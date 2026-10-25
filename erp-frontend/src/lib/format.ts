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

export function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : faNumber.format(value);
}
