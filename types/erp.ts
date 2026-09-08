/**
 * MiniProject ERP - TypeScript Domain Interfaces & Types
 */

// ==========================================
// Enums & Literals
// ==========================================

export type DocStatus =
  | "draft"
  | "pending"
  | "approved"
  | "posted"
  | "cancelled"
  | "voided";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type PayMethod = "cash" | "transfer" | "cheque" | "other";

export type RoleCode = "ADMIN" | "ACCOUNTING" | "PURCHASING" | "SALES" | string;

// ==========================================
// Common & API Response Types
// ==========================================

export interface ApiErrorResponse {
  message: string;
}

// ==========================================
// Authentication & User Models
// ==========================================

export interface AppUser {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  roles?: string[];
}

export interface UserRole {
  user_id: number;
  role_id: number;
  role?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    roles: string[];
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name: string;
  email?: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  full_name: string;
}

// ==========================================
// Master Data Models & Requests
// ==========================================

// Unit
export interface Unit {
  id: number;
  code: string;
  name: string;
}

export interface CreateUnitRequest {
  code: string;
  name: string;
}

export interface UpdateUnitRequest {
  code?: string;
  name?: string;
}

// Product Category
export interface ProductCategory {
  id: number;
  code: string;
  name: string;
}

export interface CreateProductCategoryRequest {
  code: string;
  name: string;
}

export interface UpdateProductCategoryRequest {
  code?: string;
  name?: string;
}

// Product
export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id?: number | null;
  unit_id: number;
  sale_price: number | string;
  reorder_point: number | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  unit?: Unit;
  product_category?: ProductCategory | null;
  unit_code?: string;
  unit_name?: string;
  category_code?: string;
  category_name?: string;
  on_hand?: number | string;
  low_stock?: boolean;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  category_id?: number | null;
  unit_id: number;
  sale_price: number | string;
  reorder_point: number | string;
}

export interface UpdateProductRequest {
  name?: string;
  category_id?: number | null;
  unit_id?: number;
  sale_price?: number | string;
  reorder_point?: number | string;
  is_active?: boolean;
}

// Customer
export interface Customer {
  id: number;
  code: string;
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  credit_days: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateCustomerRequest {
  code: string;
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  credit_days?: number;
}

export interface UpdateCustomerRequest {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  credit_days?: number;
  is_active?: boolean;
}

// Supplier
export interface Supplier {
  id: number;
  code: string;
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  credit_days: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateSupplierRequest {
  code: string;
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  credit_days?: number;
}

export interface UpdateSupplierRequest {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  credit_days?: number;
  is_active?: boolean;
}

// Account
export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: string;
  is_active: boolean;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
  normal_balance: "D" | "C" | string;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  normal_balance?: string;
  is_active?: boolean;
}

// User Master
export interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_role?: UserRole[];
}

export interface CreateUserRequest {
  username: string;
  password?: string;
  password_hash?: string;
  full_name: string;
  email?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  is_active?: boolean;
}

// ==========================================
// Purchasing Models & Requests
// ==========================================

// Purchase Requisition (PR)
export interface PurchaseRequisitionLine {
  id?: number;
  pr_id?: number;
  line_no: number;
  product_id: number;
  qty: number | string;
  note?: string | null;
  product?: Product;
}

export interface PurchaseRequisition {
  id: number;
  pr_no: string;
  pr_date: string;
  status: DocStatus;
  note?: string | null;
  created_by: number;
  created_at: string;
  line?: PurchaseRequisitionLine[];
}

export interface CreatePRRequest {
  pr_date: string;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    note?: string;
  }[];
}

export interface UpdatePRRequest {
  pr_date?: string;
  note?: string;
  lines?: {
    product_id: number;
    qty: number;
    note?: string;
  }[];
}

// Purchase Order (PO)
export interface PurchaseOrderLine {
  id?: number;
  po_id?: number;
  line_no: number;
  product_id: number;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
  product?: Product;
}

export interface PurchaseOrder {
  id: number;
  po_no: string;
  po_date: string;
  supplier_id: number;
  pr_id?: number | null;
  status: DocStatus;
  subtotal_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  note?: string | null;
  created_by: number;
  created_at: string;
  supplier?: Supplier;
  purchase_requisition?: PurchaseRequisition | null;
  line?: PurchaseOrderLine[];
}

export interface CreatePORequest {
  po_date: string;
  supplier_id: number;
  pr_id?: number | null;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

export interface UpdatePORequest {
  po_date?: string;
  supplier_id?: number;
  subtotal_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  note?: string;
  lines?: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

// Goods Receipt (GR)
export interface GoodsReceiptLine {
  id?: number;
  gr_id?: number;
  line_no: number;
  product_id: number;
  po_line_id?: number | null;
  qty: number | string;
  unit_cost: number | string;
  product?: Product;
}

export interface GoodsReceipt {
  id: number;
  gr_no: string;
  gr_date: string;
  supplier_id: number;
  po_id?: number | null;
  status: DocStatus;
  note?: string | null;
  created_by: number;
  created_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder | null;
  line?: GoodsReceiptLine[];
}

export interface CreateGoodsReceiptRequest {
  gr_date: string;
  supplier_id: number;
  po_id?: number | null;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    unit_cost?: number;
  }[];
}

// Supplier Bill (Bill)
export interface SupplierBillLine {
  id?: number;
  bill_id?: number;
  line_no: number;
  product_id?: number | null;
  account_id?: number | null;
  description?: string | null;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
  product?: Product | null;
  account?: Account | null;
}

export interface SupplierBill {
  id: number;
  bill_no: string;
  supplier_ref?: string | null;
  bill_date: string;
  due_date?: string | null;
  supplier_id: number;
  po_id?: number | null;
  gr_id?: number | null;
  subtotal_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  status: DocStatus;
  created_by: number;
  created_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder | null;
  goods_receipt?: GoodsReceipt | null;
  line?: SupplierBillLine[];
}

export interface CreateSupplierBillRequest {
  bill_date: string;
  supplier_ref?: string;
  due_date?: string;
  supplier_id: number;
  po_id?: number | null;
  gr_id?: number | null;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  created_by?: number;
  lines: {
    product_id?: number | null;
    account_id?: number | null;
    description?: string;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

// Payment
export interface PaymentAllocation {
  id?: number;
  payment_id?: number;
  bill_id: number;
  amount: number | string;
  supplier_bill?: SupplierBill;
}

export interface Payment {
  id: number;
  payment_no: string;
  payment_date: string;
  supplier_id: number;
  method: PayMethod;
  cash_account_id: number;
  amount: number | string;
  status: DocStatus;
  note?: string | null;
  created_by: number;
  created_at: string;
  supplier?: Supplier;
  account?: Account;
  payment_allocation?: PaymentAllocation[];
}

export interface CreatePaymentRequest {
  payment_date: string;
  supplier_id: number;
  method: PayMethod;
  cash_account_id: number;
  amount: number;
  note?: string;
  created_by?: number;
  allocations: {
    bill_id: number;
    amount: number;
  }[];
}

// ==========================================
// Sales Models & Requests
// ==========================================

// Quotation (QT)
export interface QuotationLine {
  id?: number;
  qt_id?: number;
  line_no: number;
  product_id: number;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
  product?: Product;
}

export interface Quotation {
  id: number;
  qt_no: string;
  qt_date: string;
  valid_until?: string | null;
  customer_id: number;
  status: DocStatus;
  subtotal_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  note?: string | null;
  created_by: number;
  created_at: string;
  customer?: Customer;
  line?: QuotationLine[];
}

export interface CreateQuotationRequest {
  qt_date: string;
  valid_until?: string;
  customer_id: number;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

export interface UpdateQuotationRequest {
  qt_date?: string;
  valid_until?: string;
  customer_id?: number;
  subtotal_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  note?: string;
  lines?: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

// Sales Order (SO)
export interface SalesOrderLine {
  id?: number;
  so_id?: number;
  line_no: number;
  product_id: number;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
  product?: Product;
}

export interface SalesOrder {
  id: number;
  so_no: string;
  so_date: string;
  customer_id: number;
  qt_id?: number | null;
  status: DocStatus;
  subtotal_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  note?: string | null;
  created_by: number;
  created_at: string;
  customer?: Customer;
  quotation?: Quotation | null;
  line?: SalesOrderLine[];
}

export interface CreateSalesOrderRequest {
  so_date: string;
  customer_id: number;
  qt_id?: number | null;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

export interface UpdateSalesOrderRequest {
  so_date?: string;
  customer_id?: number;
  subtotal_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  note?: string;
  lines?: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

// Shipment
export interface ShipmentLine {
  id?: number;
  shipment_id?: number;
  line_no: number;
  product_id: number;
  so_line_id?: number | null;
  qty: number | string;
  product?: Product;
}

export interface Shipment {
  id: number;
  sh_no: string;
  sh_date: string;
  customer_id: number;
  so_id?: number | null;
  status: DocStatus;
  note?: string | null;
  created_by: number;
  created_at: string;
  customer?: Customer;
  sales_order?: SalesOrder | null;
  line?: ShipmentLine[];
}

export interface CreateShipmentRequest {
  sh_date: string;
  customer_id: number;
  so_id?: number | null;
  note?: string;
  created_by?: number;
  lines: {
    product_id: number;
    qty: number;
    so_line_id?: number | null;
  }[];
}

// Invoice
export interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  line_no: number;
  product_id?: number | null;
  account_id?: number | null;
  description?: string | null;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
  product?: Product | null;
  account?: Account | null;
}

export interface Invoice {
  id: number;
  inv_no: string;
  inv_date: string;
  due_date?: string | null;
  customer_id: number;
  so_id?: number | null;
  shipment_id?: number | null;
  subtotal_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  status: DocStatus;
  created_by: number;
  created_at: string;
  customer?: Customer;
  sales_order?: SalesOrder | null;
  shipment?: Shipment | null;
  line?: InvoiceLine[];
}

export interface CreateInvoiceRequest {
  inv_date: string;
  due_date?: string;
  customer_id: number;
  so_id?: number | null;
  shipment_id?: number | null;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  created_by?: number;
  lines: {
    product_id?: number | null;
    account_id?: number | null;
    description?: string;
    qty: number;
    unit_price: number;
    line_amount: number;
  }[];
}

// Receipt
export interface ReceiptAllocation {
  id?: number;
  receipt_id?: number;
  invoice_id: number;
  amount: number | string;
  invoice?: Invoice;
}

export interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  customer_id: number;
  method: PayMethod;
  cash_account_id: number;
  amount: number | string;
  status: DocStatus;
  note?: string | null;
  created_by: number;
  created_at: string;
  customer?: Customer;
  account?: Account;
  receipt_allocation?: ReceiptAllocation[];
}

export interface CreateReceiptRequest {
  receipt_date: string;
  customer_id: number;
  method: PayMethod;
  cash_account_id: number;
  amount: number;
  note?: string;
  created_by?: number;
  allocations: {
    invoice_id: number;
    amount: number;
  }[];
}

// ==========================================
// Accounting & Reports
// ==========================================

export interface TrialBalanceAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: string;
  total_debit: number | string;
  total_credit: number | string;
  balance: number | string;
}

export interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  total_debit: number | string;
  total_credit: number | string;
  is_balanced: boolean;
}
