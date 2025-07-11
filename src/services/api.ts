// src/services/api.ts

import { 
  CategoryRequest, 
  CategoryResponse, 
  ProductRequest, 
  ProductResponse,
  ProductBatchRequest,
  ProductBatchResponse,
  StoreRequest,
  StoreResponse,
  InventoryMovementRequest,
  InventoryMovementResponse,
  ProductStoreRequest,
  ProductStoreResponse,
  ProductFilters,
  InventoryFilters,
  StockAlert,
  DashboardData
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const BASE_PATH = '/chocorocks/api';

// Generic API error class
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Generic API class
class ApiService {
  private baseUrl: string;

  constructor(endpoint: string) {
    this.baseUrl = `${API_BASE_URL}${BASE_PATH}${endpoint}`;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData: any = null;

        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response as unknown as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error('API request failed:', error);
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  async getAll<T>(): Promise<T[]> {
    return this.request<T[]>('');
  }

  async getById<T>(id: number): Promise<T> {
    return this.request<T>(`/${id}`);
  }

  async create<TRequest, TResponse>(data: TRequest): Promise<TResponse> {
    return this.request<TResponse>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update<TRequest, TResponse>(
    id: number, 
    data: TRequest
  ): Promise<TResponse> {
    return this.request<TResponse>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(id: number): Promise<void> {
    return this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async customRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, options);
  }
}

// Category API
export class CategoryAPI extends ApiService {
  constructor() {
    super('/categories');
  }

  async getAllCategories(): Promise<CategoryResponse[]> {
    return this.getAll<CategoryResponse>();
  }

  async getCategoryById(id: number): Promise<CategoryResponse> {
    return this.getById<CategoryResponse>(id);
  }

  async createCategory(data: CategoryRequest): Promise<CategoryResponse> {
    return this.create<CategoryRequest, CategoryResponse>(data);
  }

  async updateCategory(
    id: number, 
    data: CategoryRequest
  ): Promise<CategoryResponse> {
    return this.update<CategoryRequest, CategoryResponse>(id, data);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.delete(id);
  }
}

// Product API
export class ProductAPI extends ApiService {
  constructor() {
    super('/products');
  }

  async getAllProducts(): Promise<ProductResponse[]> {
    return this.getAll<ProductResponse>();
  }

  async getProductById(id: number): Promise<ProductResponse> {
    return this.getById<ProductResponse>(id);
  }

  async createProduct(data: ProductRequest): Promise<ProductResponse> {
    return this.create<ProductRequest, ProductResponse>(data);
  }

  async updateProduct(
    id: number, 
    data: ProductRequest
  ): Promise<ProductResponse> {
    return this.update<ProductRequest, ProductResponse>(id, data);
  }

  async deleteProduct(id: number): Promise<void> {
    return this.delete(id);
  }

  async searchProducts(filters: ProductFilters): Promise<ProductResponse[]> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.flavor) params.append('flavor', filters.flavor);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.size) params.append('size', filters.size.toString());

    const endpoint = params.toString() ? `/search?${params.toString()}` : '';
    return this.customRequest<ProductResponse[]>(endpoint);
  }

  async getProductsByCategory(categoryId: number): Promise<ProductResponse[]> {
    return this.customRequest<ProductResponse[]>(`/category/${categoryId}`);
  }
}

// Store API
export class StoreAPI extends ApiService {
  constructor() {
    super('/stores');
  }

  async getAllStores(): Promise<StoreResponse[]> {
    return this.getAll<StoreResponse>();
  }

  async getStoreById(id: number): Promise<StoreResponse> {
    return this.getById<StoreResponse>(id);
  }

  async createStore(data: StoreRequest): Promise<StoreResponse> {
    return this.create<StoreRequest, StoreResponse>(data);
  }

  async updateStore(id: number, data: StoreRequest): Promise<StoreResponse> {
    return this.update<StoreRequest, StoreResponse>(id, data);
  }

  async deleteStore(id: number): Promise<void> {
    return this.delete(id);
  }

  async getActiveStores(): Promise<StoreResponse[]> {
    return this.customRequest<StoreResponse[]>('/active');
  }
}

// ProductBatch API
export class ProductBatchAPI extends ApiService {
  constructor() {
    super('/product-batches');
  }

  async getAllBatches(): Promise<ProductBatchResponse[]> {
    return this.getAll<ProductBatchResponse>();
  }

  async getBatchById(id: number): Promise<ProductBatchResponse> {
    return this.getById<ProductBatchResponse>(id);
  }

  async createBatch(data: ProductBatchRequest): Promise<ProductBatchResponse> {
    return this.create<ProductBatchRequest, ProductBatchResponse>(data);
  }

  async updateBatch(
    id: number, 
    data: ProductBatchRequest
  ): Promise<ProductBatchResponse> {
    return this.update<ProductBatchRequest, ProductBatchResponse>(id, data);
  }

  async deleteBatch(id: number): Promise<void> {
    return this.delete(id);
  }

  async getBatchesByProduct(productId: number): Promise<ProductBatchResponse[]> {
    return this.customRequest<ProductBatchResponse[]>(`/product/${productId}`);
  }

  async getBatchesByStore(storeId: number): Promise<ProductBatchResponse[]> {
    return this.customRequest<ProductBatchResponse[]>(`/store/${storeId}`);
  }

  async getExpiringBatches(days: number = 30): Promise<ProductBatchResponse[]> {
    return this.customRequest<ProductBatchResponse[]>(`/expiring?days=${days}`);
  }
}

// ProductStore API
export class ProductStoreAPI extends ApiService {
  constructor() {
    super('/product-stores');
  }

  async getAllProductStores(): Promise<ProductStoreResponse[]> {
    return this.getAll<ProductStoreResponse>();
  }

  async getProductStoreById(id: number): Promise<ProductStoreResponse> {
    return this.getById<ProductStoreResponse>(id);
  }

  async createProductStore(data: ProductStoreRequest): Promise<ProductStoreResponse> {
    return this.create<ProductStoreRequest, ProductStoreResponse>(data);
  }

  async updateProductStore(
    id: number, 
    data: ProductStoreRequest
  ): Promise<ProductStoreResponse> {
    return this.update<ProductStoreRequest, ProductStoreResponse>(id, data);
  }

  async deleteProductStore(id: number): Promise<void> {
    return this.delete(id);
  }

  async getStockByStore(storeId: number): Promise<ProductStoreResponse[]> {
    return this.customRequest<ProductStoreResponse[]>(`/store/${storeId}`);
  }

  async getStockByProduct(productId: number): Promise<ProductStoreResponse[]> {
    return this.customRequest<ProductStoreResponse[]>(`/product/${productId}`);
  }

  async getLowStockAlerts(): Promise<StockAlert[]> {
    return this.customRequest<StockAlert[]>('/alerts/low-stock');
  }
}

// InventoryMovement API
export class InventoryMovementAPI extends ApiService {
  constructor() {
    super('/inventory-movements');
  }

  async getAllMovements(): Promise<InventoryMovementResponse[]> {
    return this.getAll<InventoryMovementResponse>();
  }

  async getMovementById(id: number): Promise<InventoryMovementResponse> {
    return this.getById<InventoryMovementResponse>(id);
  }

  async createMovement(data: InventoryMovementRequest): Promise<InventoryMovementResponse> {
    return this.create<InventoryMovementRequest, InventoryMovementResponse>(data);
  }

  async updateMovement(
    id: number, 
    data: InventoryMovementRequest
  ): Promise<InventoryMovementResponse> {
    return this.update<InventoryMovementRequest, InventoryMovementResponse>(id, data);
  }

  async deleteMovement(id: number): Promise<void> {
    return this.delete(id);
  }

  async getMovementsByStore(storeId: number): Promise<InventoryMovementResponse[]> {
    return this.customRequest<InventoryMovementResponse[]>(`/store/${storeId}`);
  }

  async getMovementsByProduct(productId: number): Promise<InventoryMovementResponse[]> {
    return this.customRequest<InventoryMovementResponse[]>(`/product/${productId}`);
  }

  async getMovementsByDateRange(
    startDate: string, 
    endDate: string
  ): Promise<InventoryMovementResponse[]> {
    return this.customRequest<InventoryMovementResponse[]>(
      `/date-range?start=${startDate}&end=${endDate}`
    );
  }

  async filterMovements(filters: InventoryFilters): Promise<InventoryMovementResponse[]> {
    const params = new URLSearchParams();
    
    if (filters.storeId) params.append('storeId', filters.storeId.toString());
    if (filters.productId) params.append('productId', filters.productId.toString());
    if (filters.movementType) params.append('movementType', filters.movementType);
    if (filters.reason) params.append('reason', filters.reason);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.size) params.append('size', filters.size.toString());

    return this.customRequest<InventoryMovementResponse[]>(`/filter?${params.toString()}`);
  }
}

// Dashboard API
export class DashboardAPI extends ApiService {
  constructor() {
    super('/dashboard');
  }

  async getDashboardData(): Promise<DashboardData> {
    return this.customRequest<DashboardData>('');
  }

  async getStockAlerts(): Promise<StockAlert[]> {
    return this.customRequest<StockAlert[]>('/stock-alerts');
  }

  async getRecentMovements(limit: number = 10): Promise<InventoryMovementResponse[]> {
    return this.customRequest<InventoryMovementResponse[]>(`/recent-movements?limit=${limit}`);
  }
}

// Export API instances
export const categoryAPI = new CategoryAPI();
export const productAPI = new ProductAPI();
export const storeAPI = new StoreAPI();
export const productBatchAPI = new ProductBatchAPI();
export const productStoreAPI = new ProductStoreAPI();
export const inventoryMovementAPI = new InventoryMovementAPI();
export const dashboardAPI = new DashboardAPI();