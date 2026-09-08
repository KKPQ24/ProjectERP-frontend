import { apiClient } from "./client";
import type {
  PurchaseRequisition,
  CreatePRRequest,
  UpdatePRRequest,
  PurchaseOrder,
  CreatePORequest,
  UpdatePORequest,
  GoodsReceipt,
  CreateGoodsReceiptRequest,
  SupplierBill,
  CreateSupplierBillRequest,
  Payment,
  CreatePaymentRequest,
} from "@/types";

// ==========================================
// Purchase Requisitions API
// ==========================================
export const purchaseRequisitionApi = {
  getPRs(): Promise<PurchaseRequisition[]> {
    return apiClient.get<PurchaseRequisition[]>("/api/purchase-requisitions");
  },
  getPRById(id: number | string): Promise<PurchaseRequisition> {
    return apiClient.get<PurchaseRequisition>(
      `/api/purchase-requisitions/${id}`
    );
  },
  createPR(data: CreatePRRequest): Promise<PurchaseRequisition> {
    return apiClient.post<PurchaseRequisition>(
      "/api/purchase-requisitions",
      data
    );
  },
  updatePR(
    id: number | string,
    data: UpdatePRRequest
  ): Promise<PurchaseRequisition> {
    return apiClient.put<PurchaseRequisition>(
      `/api/purchase-requisitions/${id}`,
      data
    );
  },
  submitPR(id: number | string): Promise<PurchaseRequisition> {
    return apiClient.post<PurchaseRequisition>(
      `/api/purchase-requisitions/${id}/submit`
    );
  },
  approvePR(id: number | string): Promise<PurchaseRequisition> {
    return apiClient.post<PurchaseRequisition>(
      `/api/purchase-requisitions/${id}/approve`
    );
  },
  cancelPR(id: number | string): Promise<PurchaseRequisition> {
    return apiClient.post<PurchaseRequisition>(
      `/api/purchase-requisitions/${id}/cancel`
    );
  },
};

// ==========================================
// Purchase Orders API
// ==========================================
export const purchaseOrderApi = {
  getPOs(): Promise<PurchaseOrder[]> {
    return apiClient.get<PurchaseOrder[]>("/api/purchase-orders");
  },
  getPOById(id: number | string): Promise<PurchaseOrder> {
    return apiClient.get<PurchaseOrder>(`/api/purchase-orders/${id}`);
  },
  createPO(data: CreatePORequest): Promise<PurchaseOrder> {
    return apiClient.post<PurchaseOrder>("/api/purchase-orders", data);
  },
  updatePO(
    id: number | string,
    data: UpdatePORequest
  ): Promise<PurchaseOrder> {
    return apiClient.put<PurchaseOrder>(`/api/purchase-orders/${id}`, data);
  },
  approvePO(id: number | string): Promise<PurchaseOrder> {
    return apiClient.post<PurchaseOrder>(`/api/purchase-orders/${id}/approve`);
  },
  cancelPO(id: number | string): Promise<PurchaseOrder> {
    return apiClient.post<PurchaseOrder>(`/api/purchase-orders/${id}/cancel`);
  },
};

// ==========================================
// Goods Receipts API
// ==========================================
export const goodsReceiptApi = {
  getGoodsReceipts(): Promise<GoodsReceipt[]> {
    return apiClient.get<GoodsReceipt[]>("/api/goods-receipts");
  },
  getGoodsReceiptById(id: number | string): Promise<GoodsReceipt> {
    return apiClient.get<GoodsReceipt>(`/api/goods-receipts/${id}`);
  },
  createGoodsReceipt(data: CreateGoodsReceiptRequest): Promise<GoodsReceipt> {
    return apiClient.post<GoodsReceipt>("/api/goods-receipts", data);
  },
  postGoodsReceipt(id: number | string): Promise<GoodsReceipt> {
    return apiClient.post<GoodsReceipt>(`/api/goods-receipts/${id}/post`);
  },
};

// ==========================================
// Supplier Bills API
// ==========================================
export const supplierBillApi = {
  getBills(): Promise<SupplierBill[]> {
    return apiClient.get<SupplierBill[]>("/api/bills");
  },
  getBillById(id: number | string): Promise<SupplierBill> {
    return apiClient.get<SupplierBill>(`/api/bills/${id}`);
  },
  createBill(data: CreateSupplierBillRequest): Promise<SupplierBill> {
    return apiClient.post<SupplierBill>("/api/bills", data);
  },
  postBill(id: number | string): Promise<SupplierBill> {
    return apiClient.post<SupplierBill>(`/api/bills/${id}/post`);
  },
};

// ==========================================
// Payments API
// ==========================================
export const paymentApi = {
  getPayments(): Promise<Payment[]> {
    return apiClient.get<Payment[]>("/api/payments");
  },
  getPaymentById(id: number | string): Promise<Payment> {
    return apiClient.get<Payment>(`/api/payments/${id}`);
  },
  createPayment(data: CreatePaymentRequest): Promise<Payment> {
    return apiClient.post<Payment>("/api/payments", data);
  },
  postPayment(id: number | string): Promise<Payment> {
    return apiClient.post<Payment>(`/api/payments/${id}/post`);
  },
};
