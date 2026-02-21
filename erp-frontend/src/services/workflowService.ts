import apiClient from "./apiClient";

const BASE_URL = "/Workflow/Tasks";

export const workflowService = {
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
};
