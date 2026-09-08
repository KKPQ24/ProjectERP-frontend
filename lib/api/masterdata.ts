import { apiClient } from "./client";
import type {
  Unit,
  CreateUnitRequest,
  UpdateUnitRequest,
  ProductCategory,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types";

// ==========================================
// Units API
// ==========================================
export const unitApi = {
  getUnits(): Promise<Unit[]> {
    return apiClient.get<Unit[]>("/api/units");
  },
  getUnitById(id: number | string): Promise<Unit> {
    return apiClient.get<Unit>(`/api/units/${id}`);
  },
  createUnit(data: CreateUnitRequest): Promise<Unit> {
    return apiClient.post<Unit>("/api/units", data);
  },
  updateUnit(id: number | string, data: UpdateUnitRequest): Promise<Unit> {
    return apiClient.put<Unit>(`/api/units/${id}`, data);
  },
};

// ==========================================
// Product Categories API
// ==========================================
export const categoryApi = {
  getCategories(): Promise<ProductCategory[]> {
    return apiClient.get<ProductCategory[]>("/api/categories");
  },
  getCategoryById(id: number | string): Promise<ProductCategory> {
    return apiClient.get<ProductCategory>(`/api/categories/${id}`);
  },
  createCategory(data: CreateProductCategoryRequest): Promise<ProductCategory> {
    return apiClient.post<ProductCategory>("/api/categories", data);
  },
  updateCategory(
    id: number | string,
    data: UpdateProductCategoryRequest
  ): Promise<ProductCategory> {
    return apiClient.put<ProductCategory>(`/api/categories/${id}`, data);
  },
};

// ==========================================
// Products API
// ==========================================
export const productApi = {
  getProducts(): Promise<Product[]> {
    return apiClient.get<Product[]>("/api/products");
  },
  getLowStockProducts(): Promise<Product[]> {
    return apiClient.get<Product[]>("/api/products/low-stock");
  },
  getProductById(id: number | string): Promise<Product> {
    return apiClient.get<Product>(`/api/products/${id}`);
  },
  createProduct(data: CreateProductRequest): Promise<Product> {
    return apiClient.post<Product>("/api/products", data);
  },
  updateProduct(
    id: number | string,
    data: UpdateProductRequest
  ): Promise<Product> {
    return apiClient.put<Product>(`/api/products/${id}`, data);
  },
  deleteProduct(id: number | string): Promise<Product> {
    return apiClient.delete<Product>(`/api/products/${id}`);
  },
};

// ==========================================
// Customers API
// ==========================================
export const customerApi = {
  getCustomers(): Promise<Customer[]> {
    return apiClient.get<Customer[]>("/api/customers");
  },
  getCustomerById(id: number | string): Promise<Customer> {
    return apiClient.get<Customer>(`/api/customers/${id}`);
  },
  createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    return apiClient.post<Customer>("/api/customers", data);
  },
  updateCustomer(
    id: number | string,
    data: UpdateCustomerRequest
  ): Promise<Customer> {
    return apiClient.put<Customer>(`/api/customers/${id}`, data);
  },
  deleteCustomer(id: number | string): Promise<Customer> {
    return apiClient.delete<Customer>(`/api/customers/${id}`);
  },
};

// ==========================================
// Suppliers API
// ==========================================
export const supplierApi = {
  getSuppliers(): Promise<Supplier[]> {
    return apiClient.get<Supplier[]>("/api/suppliers");
  },
  getSupplierById(id: number | string): Promise<Supplier> {
    return apiClient.get<Supplier>(`/api/suppliers/${id}`);
  },
  createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    return apiClient.post<Supplier>("/api/suppliers", data);
  },
  updateSupplier(
    id: number | string,
    data: UpdateSupplierRequest
  ): Promise<Supplier> {
    return apiClient.put<Supplier>(`/api/suppliers/${id}`, data);
  },
  deleteSupplier(id: number | string): Promise<Supplier> {
    return apiClient.delete<Supplier>(`/api/suppliers/${id}`);
  },
};

// ==========================================
// Accounts API
// ==========================================
export const accountApi = {
  getAccounts(): Promise<Account[]> {
    return apiClient.get<Account[]>("/api/accounts");
  },
  getAccountById(id: number | string): Promise<Account> {
    return apiClient.get<Account>(`/api/accounts/${id}`);
  },
  createAccount(data: CreateAccountRequest): Promise<Account> {
    return apiClient.post<Account>("/api/accounts", data);
  },
  updateAccount(
    id: number | string,
    data: UpdateAccountRequest
  ): Promise<Account> {
    return apiClient.put<Account>(`/api/accounts/${id}`, data);
  },
  deleteAccount(id: number | string): Promise<Account> {
    return apiClient.delete<Account>(`/api/accounts/${id}`);
  },
};

// ==========================================
// Users API
// ==========================================
export const userApi = {
  getUsers(): Promise<User[]> {
    return apiClient.get<User[]>("/api/users");
  },
  getUserById(id: number | string): Promise<User> {
    return apiClient.get<User>(`/api/users/${id}`);
  },
  createUser(data: CreateUserRequest): Promise<User> {
    return apiClient.post<User>("/api/users", data);
  },
  updateUser(id: number | string, data: UpdateUserRequest): Promise<User> {
    return apiClient.put<User>(`/api/users/${id}`, data);
  },
  deleteUser(id: number | string): Promise<User> {
    return apiClient.delete<User>(`/api/users/${id}`);
  },
};
