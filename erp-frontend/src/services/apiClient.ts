import axios from "axios";

// 1. تنظیم آدرس پایه
// اگر فایل .env.local داشته باشید از آن می‌خواند، وگرنه پیش‌فرض localhost:5000 است
// نکته: اگر بک‌اند شما روی https است، حتما در env آدرس https را وارد کنید
const envBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// حذف اسلش اضافه از انتهای آدرس (اگر کاربر اشتباهی http://localhost:5000/ وارد کرده باشد)
const cleanBaseUrl = envBaseUrl.replace(/\/+$/, "");

const apiClient = axios.create({
  // اضافه کردن /api به انتهای آدرس به صورت خودکار
  baseURL: `${cleanBaseUrl}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. اینترسپتور درخواست (افزودن توکن به هدر)
apiClient.interceptors.request.use(
  (config) => {
    // اطمینان از اجرا در سمت کلاینت (نه SSR)
    if (typeof window !== "undefined") {
      // نکته مهم: نام کلید باید دقیقاً همان چیزی باشد که در صفحه لاگین setItem کرده‌اید.
      // من اینجا "token" گذاشتم چون رایج‌تر است.
      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. اینترسپتور پاسخ (مدیریت خطاها)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // اگر سرور خطای 401 (Unauthorize) داد
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        // توکن را پاک کن
        localStorage.removeItem("accessToken");

        // اگر کاربر در صفحه لاگین نیست، او را به لاگین بفرست
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    // لاگ کردن خطای شبکه (زمانی که سرور خاموش است یا CORS خطا می‌دهد)
    if (error.code === "ERR_NETWORK") {
      console.error(
        "خطای شبکه: ارتباط با سرور برقرار نشد (بررسی کنید بک‌اند روشن باشد و پورت صحیح باشد)."
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
