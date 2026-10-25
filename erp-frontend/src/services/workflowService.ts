import apiClient from "@/lib/api/client";
import type {
  CreateProcessCommand,
  CreateStateCommand,
  CreateTransitionCommand,
  InboxTaskDto,
  PagedQuery,
  Paged,
} from "@/types/api";
import type { ProcessDto, WorkflowRoleDto } from "@/types/workflow";

// 🌟 مسیر پایه با توجه به کلاس TasksController در بک‌اند
const BASE_URL = "/Workflow/Tasks";

export const workflowService = {
  // ==========================================
  // بخش اول: کارتابل (Inbox) و عملیات روزمره
  // ==========================================
  getInboxTasks: async (query: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<InboxTaskDto>>(`${BASE_URL}/inbox`, query, { signal });
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
  getAllProcesses: async (query: PagedQuery, signal?: AbortSignal) => {
    const response = await apiClient.post<Paged<ProcessDto>>(`${BASE_URL}/processes/list`, query, { signal });
    return response.data;
  },

  createProcess: async (data: CreateProcessCommand) => {
    const response = await apiClient.post(`${BASE_URL}/processes`, data);
    return response.data;
  },

  getProcessDetails: async (id: number) => {
    const response = await apiClient.get(`${BASE_URL}/processes/${id}`);
    return response.data;
  },

  createState: async (data: CreateStateCommand) => {
    const response = await apiClient.post(`${BASE_URL}/states`, data);
    return response.data;
  },

  createTransition: async (data: CreateTransitionCommand) => {
    const response = await apiClient.post(`${BASE_URL}/transitions`, data);
    return response.data;
  },

  // نقش‌های مجاز یک دکمه را کامل جایگزین می‌کند؛ لیست خالی = آزاد برای همه
  updateTransitionRoles: async (transitionId: number, roleIds: string[]) => {
    await apiClient.put(`${BASE_URL}/transitions/${transitionId}/roles`, roleIds);
  },

  getRoles: async (): Promise<WorkflowRoleDto[]> => {
    const response = await apiClient.get<WorkflowRoleDto[]>(`${BASE_URL}/roles`);
    return response.data;
  },
};
