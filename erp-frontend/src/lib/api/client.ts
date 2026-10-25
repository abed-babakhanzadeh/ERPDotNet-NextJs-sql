import axios from "axios";
import { toApiError } from "./errors";

const envBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const cleanBaseUrl = envBaseUrl.replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "accessToken";

/**
 * تنها نمونه HTTP برنامه. فقط سرویس‌ها (src/services) از آن استفاده می‌کنند، نه صفحه‌ها.
 * هر خطا به `ApiError` با پیام فارسی تبدیل می‌شود.
 */
export const apiClient = axios.create({
  baseURL: `${cleanBaseUrl}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);

    // نشست منقضی: خروج و انتقال به ورود (به‌جز خود درخواست ورود)
    const isLoginRequest = String(error?.config?.url ?? "").includes("/Auth/login");
    if (apiError.status === 401 && !isLoginRequest && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(apiError);
  },
);

export default apiClient;
