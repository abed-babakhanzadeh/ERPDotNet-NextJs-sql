"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * هوک عمومی برای prefetch کردن آدرس‌ها
 */
export function useTabPrefetch(urls: string[]) {
  const router = useRouter();

  // برای جلوگیری از رندر تکراری به خاطر تغییر رفرنس آرایه، آن را استرینگ می‌کنیم
  const urlsString = JSON.stringify(urls);

  useEffect(() => {
    if (!urls || urls.length === 0) return;

    urls.forEach((url) => {
      // متد prefetch در App Router همیشه وجود دارد و نیازی به try-catch یا any نیست
      router.prefetch(url);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, urlsString]);
}
