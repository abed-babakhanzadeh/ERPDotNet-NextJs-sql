import { useEffect } from "react";

export function useFormPersist(
  key: string,
  formData: any,
  setFormData: (data: any) => void
) {
  useEffect(() => {
    const savedData = localStorage.getItem(key);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        setFormData((prev: any) => {
          // اصلاح: اگر داده‌ی قبلی یا داده‌ی ذخیره شده آرایه باشد، جایگزین کن (Merge نکن)
          if (Array.isArray(prev) || Array.isArray(parsed)) {
            return parsed;
          }
          // اگر آبجکت بود، مرج کن
          return { ...prev, ...parsed };
        });
      } catch (e) {
        console.error("Error parsing saved form data", e);
      }
    }
  }, [key, setFormData]); // وابستگی‌ها

  useEffect(() => {
    if (formData) {
      const handler = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [formData, key]);

  const clearStorage = () => {
    localStorage.removeItem(key);
  };

  return { clearStorage };
}
