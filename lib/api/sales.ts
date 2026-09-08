import { apiClient } from "./client";
import type {
  Quotation,
  CreateQuotationRequest,
  UpdateQuotationRequest,
  SalesOrder,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  Shipment,
  CreateShipmentRequest,
  Invoice,
  CreateInvoiceRequest,
  Receipt,
  CreateReceiptRequest,
} from "@/types";

// ==========================================
// Quotations API
// ==========================================
export const quotationApi = {
  getQuotations(): Promise<Quotation[]> {
    return apiClient.get<Quotation[]>("/api/quotations");
  },
  getQuotationById(id: number | string): Promise<Quotation> {
    return apiClient.get<Quotation>(`/api/quotations/${id}`);
  },
  createQuotation(data: CreateQuotationRequest): Promise<Quotation> {
    return apiClient.post<Quotation>("/api/quotations", data);
  },
  updateQuotation(
    id: number | string,
    data: UpdateQuotationRequest
  ): Promise<Quotation> {
    return apiClient.put<Quotation>(`/api/quotations/${id}`, data);
  },
  submitQuotation(id: number | string): Promise<Quotation> {
    return apiClient.post<Quotation>(`/api/quotations/${id}/submit`);
  },
  approveQuotation(id: number | string): Promise<Quotation> {
    return apiClient.post<Quotation>(`/api/quotations/${id}/approve`);
  },
  cancelQuotation(id: number | string): Promise<Quotation> {
    return apiClient.post<Quotation>(`/api/quotations/${id}/cancel`);
  },
};

// ==========================================
// Sales Orders API
// ==========================================
export const salesOrderApi = {
  getSalesOrders(): Promise<SalesOrder[]> {
    return apiClient.get<SalesOrder[]>("/api/sales-orders");
  },
  getSalesOrderById(id: number | string): Promise<SalesOrder> {
    return apiClient.get<SalesOrder>(`/api/sales-orders/${id}`);
  },
  createSalesOrder(data: CreateSalesOrderRequest): Promise<SalesOrder> {
    return apiClient.post<SalesOrder>("/api/sales-orders", data);
  },
  updateSalesOrder(
    id: number | string,
    data: UpdateSalesOrderRequest
  ): Promise<SalesOrder> {
    return apiClient.put<SalesOrder>(`/api/sales-orders/${id}`, data);
  },
  approveSalesOrder(id: number | string): Promise<SalesOrder> {
    return apiClient.post<SalesOrder>(`/api/sales-orders/${id}/approve`);
  },
  cancelSalesOrder(id: number | string): Promise<SalesOrder> {
    return apiClient.post<SalesOrder>(`/api/sales-orders/${id}/cancel`);
  },
};

// ==========================================
// Shipments API
// ==========================================
export const shipmentApi = {
  getShipments(): Promise<Shipment[]> {
    return apiClient.get<Shipment[]>("/api/shipments");
  },
  getShipmentById(id: number | string): Promise<Shipment> {
    return apiClient.get<Shipment>(`/api/shipments/${id}`);
  },
  createShipment(data: CreateShipmentRequest): Promise<Shipment> {
    return apiClient.post<Shipment>("/api/shipments", data);
  },
  postShipment(id: number | string): Promise<Shipment> {
    return apiClient.post<Shipment>(`/api/shipments/${id}/post`);
  },
};

// ==========================================
// Invoices API
// ==========================================
export const invoiceApi = {
  getInvoices(): Promise<Invoice[]> {
    return apiClient.get<Invoice[]>("/api/invoices");
  },
  getInvoiceById(id: number | string): Promise<Invoice> {
    return apiClient.get<Invoice>(`/api/invoices/${id}`);
  },
  createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    return apiClient.post<Invoice>("/api/invoices", data);
  },
  postInvoice(id: number | string): Promise<Invoice> {
    return apiClient.post<Invoice>(`/api/invoices/${id}/post`);
  },
};

// ==========================================
// Receipts API
// ==========================================
export const receiptApi = {
  getReceipts(): Promise<Receipt[]> {
    return apiClient.get<Receipt[]>("/api/receipts");
  },
  getReceiptById(id: number | string): Promise<Receipt> {
    return apiClient.get<Receipt>(`/api/receipts/${id}`);
  },
  createReceipt(data: CreateReceiptRequest): Promise<Receipt> {
    return apiClient.post<Receipt>("/api/receipts", data);
  },
  postReceipt(id: number | string): Promise<Receipt> {
    return apiClient.post<Receipt>(`/api/receipts/${id}/post`);
  },
};
