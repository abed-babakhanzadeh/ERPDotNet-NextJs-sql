"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toApiError } from "@/lib/api/errors";

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  reload: () => void;
}

/**
 * بارگذاری ساده یک داده با لغو درخواست قبلی. `enabled=false` (مثلاً نبود مجوز) هیچ درخواستی نمی‌فرستد.
 */
export function useAsyncData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    loadRef
      .current(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(toApiError(e).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, isLoading, reload };
}
