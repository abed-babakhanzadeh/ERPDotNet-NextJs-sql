/**
 * اولین پیام خطای react-hook-form به ترتیب فیلدهای داده‌شده؛ برای نمایش در toast.
 * خطای سطرهای جدول آرایه‌ای به ترتیب ردیف است، پس عمقی پیمایش می‌شود.
 */
export function firstFormError(errors: Record<string, unknown>, order: string[]): string | undefined {
  for (const key of order) {
    const found = findMessage(errors[key]);
    if (found) return found;
  }
  return undefined;
}

function findMessage(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const { message } = node as { message?: unknown };
  if (typeof message === "string" && message) return message;
  // ref عنصر DOM است و نباید پیمایش شود
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (key === "ref") continue;
    const found = findMessage(child);
    if (found) return found;
  }
  return undefined;
}
