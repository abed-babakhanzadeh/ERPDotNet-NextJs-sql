import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// آدرس IP سیستم خود را اینجا وارد کنید. در شبیه‌ساز اندروید معمولا 10.0.2.2 است
// اما اگر روی گوشی واقعی تست می‌کنید باید IP سیستم (مثلا 192.168.1.5) را بزنید
// نکته: پورت باید همان پورتی باشد که API روی آن اجرا می‌شود (مثلا 5000 یا 5001)
const API_URL = 'http://192.168.0.241:5000/api'; 
// const API_URL = 'http://94.182.39.201:5000';


const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// کلید ذخیره‌سازی توکن
export const TOKEN_KEY = 'auth_token';
export const USER_INFO_KEY = 'user_info';

// اینترسپتور برای افزودن توکن به درخواست‌ها
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error reading token', error);
  }
  return config;
});

// اینترسپتور برای مدیریت خطاهای عمومی (مثل 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // اگر توکن منقضی شده بود، لاگ‌اوت کنیم یا به صفحه لاگین بفرستیم
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

export default apiClient;