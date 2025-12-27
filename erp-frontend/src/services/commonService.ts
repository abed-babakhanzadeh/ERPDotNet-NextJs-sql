import apiClient from "./apiClient";

export interface EnumItem {
  id: number;
  title: string;
}

export const commonService = {
  getEnum: async (enumName: string) => {
    const { data } = await apiClient.get<EnumItem[]>(
      `/Common/Enums/${enumName}`
    );
    return data;
  },
};
