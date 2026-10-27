import { apiClient } from "./client";
import type { AuditLogEntry, HistoryPage, StockMovement } from "@/types";

type HistoryParams = { page?: number; limit?: number; search?: string };
export const historyApi = {
  getStockMovements(params: HistoryParams & { product_id?: number; ref_type?: string }, signal?: AbortSignal) {
    return apiClient.get<HistoryPage<StockMovement>>("/api/stock-movements", params, { signal });
  },
  getAuditLogs(params: HistoryParams & { user_id?: number; entity?: string; action?: string }, signal?: AbortSignal) {
    return apiClient.get<HistoryPage<AuditLogEntry>>("/api/audit-logs", params, { signal });
  },
};
