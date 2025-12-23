import apiClient from './apiClient';

// --- Types ---
export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  fullName?: string;
}

export interface Role {
  id: string;
  name: string;
  title: string;
}

export interface BOM {
  id: number;
  title: string;
  productName: string;
  version: string;
  status: string;
  isActive: boolean;
}

export interface Unit {
  id: number;
  title: string;
  symbol: string;
}

// تایپ جدید برای گزارش
export interface WhereUsedItem {
  bomId: number;
  bomTitle: string;
  productName: string;
  level: number;
  quantity: number;
  unit: string;
}

const defaultSearchParams = {
  pageNumber: 1,
  pageSize: 100,
  searchTerm: "",
  filters: []
};

// --- Services ---
export const modulesService = {
  
  // 1. Users
  getUsers: async (searchTerm: string = "") => {
    try {
      const response = await apiClient.post('/Users/search', { ...defaultSearchParams, searchTerm });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 405) {
        const response = await apiClient.get('/Users');
        return response.data;
      }
      throw error;
    }
  },

  // 2. Roles
  getRoles: async () => {
    const response = await apiClient.get('/Roles');
    return response.data;
  },

  // 3. Units
  getUnits: async () => {
    const response = await apiClient.post('/BaseInfo/Units/search', defaultSearchParams);
    return response.data;
  },

  // 4. BOMs
  getBOMs: async (searchTerm: string = "") => {
    const response = await apiClient.post('/ProductEngineering/BOMs/search', {
       ...defaultSearchParams,
       searchTerm
    });
    return response.data;
  },

  // 5. متد جدید: گزارش مصرف مواد (Where Used)
  getMaterialUsage: async (itemId: number) => {
    // طبق کنترلر BOMsController
    const response = await apiClient.post('/ProductEngineering/BOMs/where-used', {
      itemId: itemId,
      pageNumber: 1,
      pageSize: 50
    });
    return response.data;
  }
};