import { useEffect, useRef, useState } from "react";

/**
 * برای فرم‌هایی که با useState کار می‌کنند (نه react-hook-form):
 * اولین مقدار بعد از `ready` را مبنا می‌گیرد و هر تفاوتی با آن را «تغییر ذخیره‌نشده» حساب می‌کند.
 * با عوض شدن `resetKey` (مثلاً rowVersion بعد از ذخیره) مبنا دوباره گرفته می‌شود.
 */
export function useDirtySnapshot(value: unknown, ready: boolean, resetKey?: unknown): boolean {
  const serialized = JSON.stringify(value);
  const [baseline, setBaseline] = useState<string | null>(null);
  const keyRef = useRef(resetKey);

  useEffect(() => {
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey;
      setBaseline(null);
      return;
    }
    if (ready && baseline === null) setBaseline(serialized);
  }, [ready, baseline, serialized, resetKey]);

  return ready && baseline !== null && baseline !== serialized;
}
