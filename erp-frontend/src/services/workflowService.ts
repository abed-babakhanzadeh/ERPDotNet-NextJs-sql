import apiClient from "@/lib/api/client";
import type {
  CreateProcessCommand,
  CreateStateCommand,
  CreateTransitionCommand,
  CreateDelegationCommand,
  DelegateUserDto,
  DelegationDto,
  InboxTaskDto,
  PagedQuery,
  Paged,
  TaskDetailsDto,
  UpdateStateSlaCommand,
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
    const response = await apiClient.get<TaskDetailsDto>(`${BASE_URL}/${id}`);
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

  updateStateSla: async (id: number, data: UpdateStateSlaCommand) => {
    await apiClient.put(`${BASE_URL}/states/${id}/sla`, data);
  },

  // ==========================================
  // تفویض اختیار
  // ==========================================
  getDelegations: async (): Promise<DelegationDto[]> => {
    const response = await apiClient.get<DelegationDto[]>(`${BASE_URL}/delegations`);
    return response.data;
  },

  getDelegateUsers: async (): Promise<DelegateUserDto[]> => {
    const response = await apiClient.get<DelegateUserDto[]>(`${BASE_URL}/delegations/users`);
    return response.data;
  },

  createDelegation: async (data: CreateDelegationCommand) => {
    const response = await apiClient.post<number>(`${BASE_URL}/delegations`, data);
    return response.data;
  },

  revokeDelegation: async (id: number) => {
    await apiClient.post(`${BASE_URL}/delegations/${id}/revoke`);
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
