import { useEffect } from "react";

export function useFormPersist(
  key: string,
  formData: any,
  setFormData: (data: any) => void,
  // پارامتر جدید: فقط وقتی true باشد عملیات ذخیره انجام می‌شود
  isEnabled: boolean = true
) {
  // خواندن از کش (فقط یک بار موقع لود صفحه)
  useEffect(() => {
    const savedData = localStorage.getItem(key);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData((prev: any) => {
          if (Array.isArray(prev) || Array.isArray(parsed)) {
            return parsed;
          }
          return { ...prev, ...parsed };
        });
      } catch (e) {
        console.error("Error parsing saved form data", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // setFormData را از وابستگی حذف کردیم تا لوپ نشود

  // ذخیره در کش
  useEffect(() => {
    // شرط مهم: فقط اگر isEnabled باشد و formData وجود داشته باشد ذخیره کن
    if (formData && isEnabled) {
      const handler = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [formData, key, isEnabled]);

  const clearStorage = () => {
    localStorage.removeItem(key);
  };

  return { clearStorage };
}
