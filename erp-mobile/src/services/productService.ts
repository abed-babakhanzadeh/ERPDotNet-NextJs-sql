import apiClient from './apiClient'; // <-- فقط این شکلی شروع شود
import { PaginatedResponse, Product, SearchRequest } from '../types/product';

// اگر apiClient ندارید، آدرس پایه سرور را اینجا بنویسید:
// const BASE_URL = "http://192.168.0.241:5000/api"; 

export const ProductService = {
  search: async (request: SearchRequest): Promise<PaginatedResponse<Product>> => {
    try {
      // استفاده از apiClient به جای fetch دستی
      // خودش آدرس پایه (IP) و توکن‌ها را مدیریت می‌کند
      const response = await apiClient.post('/BaseInfo/Products/search', request);
      return response.data;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    await apiClient.delete(`/BaseInfo/Products/${id}`);
  }
};