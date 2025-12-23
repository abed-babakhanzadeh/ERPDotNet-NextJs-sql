import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import apiClient, { TOKEN_KEY, USER_INFO_KEY } from './apiClient';

export interface LoginResponse {
  token: string;
  user: any;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // 1. درخواست به سرور
    const response = await apiClient.post('/Auth/login', { username, password });
    
    console.log("🔍 Server Response:", JSON.stringify(response.data, null, 2)); // لاگ دقیق پاسخ

    const data = response.data;

    // 2. پیدا کردن توکن (چه با حروف کوچک باشد چه بزرگ)
    // برخی سرورها token میدهند، برخی access_token، برخی Token
    const token = data.token || data.Token || data.access_token || data.accessToken;

    if (!token) {
      console.error("❌ Token not found in response!");
      throw new Error("توکن در پاسخ سرور یافت نشد. لطفا لاگ را چک کنید.");
    }

    // 3. ذخیره امن توکن (تبدیل قطعی به رشته)
    const tokenString = typeof token === 'string' ? token : JSON.stringify(token);
    await SecureStore.setItemAsync(TOKEN_KEY, tokenString);
    console.log("✅ Token Saved Successfully");

    // 4. ذخیره اطلاعات کاربر (اگر باشد)
    const user = data.user || data.User || data.userInfo;
    if (user) {
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    }

    return data;
  },

  hasBiometricHardware: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  loginWithBiometrics: async (): Promise<boolean> => {
    const hasBio = await authService.hasBiometricHardware();
    if (!hasBio) return false;
    const existingToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!existingToken) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'احراز هویت',
      fallbackLabel: 'رمز عبور',
    });
    return result.success;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  },

  getUser: async () => {
    const user = await SecureStore.getItemAsync(USER_INFO_KEY);
    return user ? JSON.parse(user) : null;
  }
};