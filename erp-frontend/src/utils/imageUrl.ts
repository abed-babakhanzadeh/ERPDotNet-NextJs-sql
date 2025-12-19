// src/utils/imageUrl.ts

// آدرس را ترجیحاً از متغیر محیطی (env) بخوانید
// اگر در env نبود، آدرس پیش‌فرض لوکال را استفاده کن
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5249";

export const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  // اگر آدرس خودش کامل بود (مثلا http...) دست نزن، وگرنه آدرس پایه را اضافه کن
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};
