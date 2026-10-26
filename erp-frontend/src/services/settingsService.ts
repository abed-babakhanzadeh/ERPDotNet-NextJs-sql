import apiClient from "@/lib/api/client";
import type { UpdateValuationSettingsCommand, ValuationSettingsDto } from "@/types/api";

const VALUATION = "/Settings/InventoryValuation";

/** تنظیمات سراسری سیستم */
export const settingsService = {
  getValuation: async () => (await apiClient.get<ValuationSettingsDto>(VALUATION)).data,

  updateValuation: async (command: UpdateValuationSettingsCommand) => {
    await apiClient.put(VALUATION, command);
  },
};
