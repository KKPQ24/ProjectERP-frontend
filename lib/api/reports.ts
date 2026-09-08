import { apiClient } from "./client";
import type { TrialBalanceReport } from "@/types";

export const reportApi = {
  /**
   * Get Trial Balance (งบทดลอง - Debit/Credit summary of all active accounts)
   */
  getTrialBalance(): Promise<TrialBalanceReport> {
    return apiClient.get<TrialBalanceReport>("/api/reports/trial-balance");
  },
};
