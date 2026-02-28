import apiClient from "./apiClient";

// 🌟 مسیر پایه با توجه به کلاس TasksController در بک‌اند
const BASE_URL = "/Workflow/Tasks";

export const workflowService = {
  // ==========================================
  // بخش اول: کارتابل (Inbox) و عملیات روزمره
  // ==========================================
  getInboxTasks: async (data: any) => {
    const response = await apiClient.post(`${BASE_URL}/inbox`, data);
    return response.data;
  },

  getTaskDetails: async (id: number | string) => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  completeTask: async (
    id: number | string,
    payload: { taskId: number; transitionId: number; comment?: string },
  ) => {
    const response = await apiClient.post(
      `${BASE_URL}/${id}/complete`,
      payload,
    );
    return response.data;
  },

  // ==========================================
  // بخش دوم: مدیریت گردش کار (Workflow Builder)
  // ==========================================
  getAllProcesses: async (data: any) => {
    const response = await apiClient.post(`${BASE_URL}/processes/list`, data);
    return response.data;
  },

  createProcess: async (data: any) => {
    const response = await apiClient.post(`${BASE_URL}/processes`, data);
    return response.data;
  },

  getProcessDetails: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/processes/${id}`);
    return response.data;
  },

  createState: async (data: any) => {
    const response = await apiClient.post(`${BASE_URL}/states`, data);
    return response.data;
  },

  createTransition: async (data: any) => {
    const response = await apiClient.post(`${BASE_URL}/transitions`, data);
    return response.data;
  },
};
