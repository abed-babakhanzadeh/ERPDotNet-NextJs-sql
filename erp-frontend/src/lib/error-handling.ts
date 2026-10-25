import { createElement } from "react";
import { toast } from "sonner";
import { ApiError, toApiError } from "@/lib/api/errors";

export { ApiError, toApiError } from "@/lib/api/errors";

const MAX_LISTED_MESSAGES = 5;

/**
 * نمایش یکسان خطا در کل برنامه.
 * - پیام فارسی سرور (یا پیام پیش‌فرض فارسی) به‌عنوان عنوان toast
 * - چند پیام (مثلاً چند سطر با موجودی ناکافی) به صورت فهرست
 * - برای خطای غیرمنتظره، کد پیگیری با دکمه کپی تا به پشتیبانی داده شود
 *
 * `fallbackMessage` فقط وقتی نمایش داده می‌شود که سرور پیام قابل نمایشی نداده باشد.
 * خطا را برمی‌گرداند تا فرم‌ها بتوانند `fieldErrors` را کنار فیلدها نشان دهند.
 */
export function handleApiError(error: unknown, fallbackMessage?: string): ApiError {
  const apiError = toApiError(error);

  if (apiError.code === "cancelled") return apiError;
  // 401 را interceptor با انتقال به صفحه ورود مدیریت می‌کند
  if (apiError.status === 401) return apiError;

  const isGeneric = apiError.code === "unknown" && fallbackMessage;
  const title = isGeneric ? fallbackMessage : apiError.message;

  const extra = apiError.messages.filter((m) => m !== title);
  const listed = extra.slice(0, MAX_LISTED_MESSAGES);
  const more = extra.length - listed.length;
  const lines = [...listed.map((m) => `• ${m}`)];
  if (more > 0) lines.push(`و ${more.toLocaleString("fa-IR")} مورد دیگر`);
  if (apiError.isUnexpected && apiError.traceId) lines.push(`کد پیگیری: ${apiError.traceId}`);

  toast.error(title, {
    description: lines.length
      ? createElement("div", { style: { whiteSpace: "pre-line" } }, lines.join("\n"))
      : undefined,
    duration: apiError.isUnexpected || extra.length ? 10_000 : 5_000,
    action:
      apiError.isUnexpected && apiError.traceId
        ? {
            label: "کپی کد",
            onClick: () => navigator.clipboard?.writeText(apiError.traceId!),
          }
        : undefined,
  });

  return apiError;
}

/**
 * خطای فیلدها را برای react-hook-form آماده می‌کند.
 * `fieldMap` کلید سرور را به نام فیلد فرم نگاشت می‌کند (پیش‌فرض: همان کلید).
 * خروجی: true اگر حداقل یک خطا روی فیلد نشست.
 */
export function applyFieldErrors(
  error: unknown,
  setError: (name: string, error: { type: string; message: string }) => void,
  fieldMap: Record<string, string> = {},
): boolean {
  const apiError = toApiError(error);
  let applied = false;
  for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
    if (!key || !messages?.length) continue;
    setError(fieldMap[key] ?? key, { type: "server", message: messages[0] });
    applied = true;
  }
  return applied;
}
