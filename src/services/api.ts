// src/services/api.ts (CORREGIDO SEGÚN BACKEND REAL)
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
  ClientRequest,
  ClientResponse,
  SaleRequest,
  SaleResponse,
  SaleDetailRequest,
  SaleDetailResponse,
  UserRequest,
  UserResponse,
} from '@/types';
import Cookies from 'js-cookie';

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

// Generic API class with automatic authentication
class ApiService {
  private baseUrl: string;

  constructor(endpoint: string) {
    // Corregido: usar el path correcto del backend
    this.baseUrl = `/api${endpoint}`;
  }

  // Método para obtener el token automáticamente
  private getAuthToken(): string | null {
    return Cookies.get('auth-token') || null;
  }

  // Método para obtener headers con autenticación
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Combinar headers de autenticación con headers personalizados
    const authHeaders = this.getAuthHeaders();
    const config: RequestInit = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log(`🔑 Authorization: ${authHeaders.Authorization ? 'Token incluido' : 'Sin token'}`);

      const response = await fetch(url, config);

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData: any = null;

        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        // Manejo específico de errores de autenticación
        if (response.status === 401) {
          console.error('🔐 Token inválido o expirado - limpiando cookies');
          Cookies.remove('auth-token');
          Cookies.remove('refresh-token');
          window.location.href = '/login';
          throw new ApiError('Sesión expirada. Por favor, inicia sesión nuevamente.', response.status, errorData);
        }

        if (response.status === 403) {
          console.error('🚫 Acceso denegado - permisos insuficientes');
          throw new ApiError('No tienes permisos para realizar esta acción.', response.status, errorData);
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

  // Métodos HTTP con autenticación automática
  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  protected async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Category API - ✅ Correcto según backend
export class CategoryAPI extends ApiService {
  constructor() {
    super('/categories');
  }

  async getAllCategories(): Promise<CategoryResponse[]> {
    return this.get<CategoryResponse[]>('');
  }

  async getCategoryById(id: number): Promise<CategoryResponse> {
    return this.get<CategoryResponse>(`/${id}`);
  }

  async createCategory(category: CategoryRequest): Promise<CategoryResponse> {
    return this.post<CategoryResponse>('', category);
  }

  async updateCategory(id: number, category: CategoryRequest): Promise<CategoryResponse> {
    return this.put<CategoryResponse>(`/${id}`, category);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Product API - ✅ Solo endpoints que existen en backend
export class ProductAPI extends ApiService {
  constructor() {
    super('/products');
  }

  async getAllProducts(): Promise<ProductResponse[]> {
    return this.get<ProductResponse[]>('');
  }

  async getProductById(id: number): Promise<ProductResponse> {
    return this.get<ProductResponse>(`/${id}`);
  }

  async createProduct(product: ProductRequest): Promise<ProductResponse> {
    return this.post<ProductResponse>('', product);
  }

  async updateProduct(id: number, product: ProductRequest): Promise<ProductResponse> {
    return this.put<ProductResponse>(`/${id}`, product);
  }

  async deleteProduct(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Store API - ✅ Solo endpoints que existen en backend
export class StoreAPI extends ApiService {
  constructor() {
    super('/stores');
  }

  async getAllStores(): Promise<StoreResponse[]> {
    return this.get<StoreResponse[]>('');
  }

  async getStoreById(id: number): Promise<StoreResponse> {
    return this.get<StoreResponse>(`/${id}`);
  }

  async createStore(store: StoreRequest): Promise<StoreResponse> {
    return this.post<StoreResponse>('', store);
  }

  async updateStore(id: number, store: StoreRequest): Promise<StoreResponse> {
    return this.put<StoreResponse>(`/${id}`, store);
  }

  async deleteStore(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Client API - ✅ Solo endpoints que existen en backend
export class ClientAPI extends ApiService {
  constructor() {
    super('/clients');
  }

  async getAllClients(): Promise<ClientResponse[]> {
    return this.get<ClientResponse[]>('');
  }

  async getClientById(id: number): Promise<ClientResponse> {
    return this.get<ClientResponse>(`/${id}`);
  }

  async createClient(client: ClientRequest): Promise<ClientResponse> {
    return this.post<ClientResponse>('', client);
  }

  async updateClient(id: number, client: ClientRequest): Promise<ClientResponse> {
    return this.put<ClientResponse>(`/${id}`, client);
  }

  async deleteClient(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Sale API - ✅ Solo endpoints que existen en backend + endpoint especial
export class SaleAPI extends ApiService {
  constructor() {
    super('/sales');
  }

  async getAllSales(): Promise<SaleResponse[]> {
    return this.get<SaleResponse[]>('');
  }

  async getSaleById(id: number): Promise<SaleResponse> {
    return this.get<SaleResponse>(`/${id}`);
  }

  async createSale(sale: SaleRequest): Promise<SaleResponse> {
    return this.post<SaleResponse>('', sale);
  }

  async updateSale(id: number, sale: SaleRequest): Promise<SaleResponse> {
    return this.put<SaleResponse>(`/${id}`, sale);
  }

  async deleteSale(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  // ✅ Endpoint especial que SÍ existe en backend
  async completeWithReceipt(
    id: number, 
    data: { paymentMethod?: string; additionalNotes?: string }
  ): Promise<any> {
    return this.post<any>(`/${id}/complete-with-receipt`, data);
  }
}

// Sale Detail API - ✅ NUEVO - Faltaba en api.ts anterior
export class SaleDetailAPI extends ApiService {
  constructor() {
    super('/sale-details');
  }

  async getAllSaleDetails(): Promise<SaleDetailResponse[]> {
    return this.get<SaleDetailResponse[]>('');
  }

  async getSaleDetailById(id: number): Promise<SaleDetailResponse> {
    return this.get<SaleDetailResponse>(`/${id}`);
  }

  async createSaleDetail(saleDetail: SaleDetailRequest): Promise<SaleDetailResponse> {
    return this.post<SaleDetailResponse>('', saleDetail);
  }

  async updateSaleDetail(id: number, saleDetail: SaleDetailRequest): Promise<SaleDetailResponse> {
    return this.put<SaleDetailResponse>(`/${id}`, saleDetail);
  }

  async deleteSaleDetail(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// User API - ✅ Solo endpoints que existen en backend
export class UserAPI extends ApiService {
  constructor() {
    super('/users');
  }

  async getAllUsers(): Promise<UserResponse[]> {
    return this.get<UserResponse[]>('');
  }

  async getUserById(id: number): Promise<UserResponse> {
    return this.get<UserResponse>(`/${id}`);
  }

  async createUser(user: UserRequest): Promise<UserResponse> {
    return this.post<UserResponse>('', user);
  }

  async updateUser(id: number, user: UserRequest): Promise<UserResponse> {
    return this.put<UserResponse>(`/${id}`, user);
  }

  async deleteUser(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Product Batch API - ✅ Solo endpoints que existen en backend
export class ProductBatchAPI extends ApiService {
  constructor() {
    super('/product-batches');
  }

  async getAllBatches(): Promise<ProductBatchResponse[]> {
    return this.get<ProductBatchResponse[]>('');
  }

  async getBatchById(id: number): Promise<ProductBatchResponse> {
    return this.get<ProductBatchResponse>(`/${id}`);
  }

  async createBatch(batch: ProductBatchRequest): Promise<ProductBatchResponse> {
    return this.post<ProductBatchResponse>('', batch);
  }

  async updateBatch(id: number, batch: ProductBatchRequest): Promise<ProductBatchResponse> {
    return this.put<ProductBatchResponse>(`/${id}`, batch);
  }

  async deleteBatch(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Inventory Movement API - ✅ Solo endpoints que existen en backend
export class InventoryMovementAPI extends ApiService {
  constructor() {
    super('/inventory-movements');
  }

  async getAllMovements(): Promise<InventoryMovementResponse[]> {
    return this.get<InventoryMovementResponse[]>('');
  }

  async getMovementById(id: number): Promise<InventoryMovementResponse> {
    return this.get<InventoryMovementResponse>(`/${id}`);
  }

  async createMovement(movement: InventoryMovementRequest): Promise<InventoryMovementResponse> {
    return this.post<InventoryMovementResponse>('', movement);
  }

  async updateMovement(id: number, movement: InventoryMovementRequest): Promise<InventoryMovementResponse> {
    return this.put<InventoryMovementResponse>(`/${id}`, movement);
  }

  async deleteMovement(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Product Store API - ✅ Solo endpoints que existen en backend
export class ProductStoreAPI extends ApiService {
  constructor() {
    super('/product-stores');
  }

  async getAllProductStores(): Promise<ProductStoreResponse[]> {
    return this.get<ProductStoreResponse[]>('');
  }

  async getProductStoreById(id: number): Promise<ProductStoreResponse> {
    return this.get<ProductStoreResponse>(`/${id}`);
  }

  async createProductStore(productStore: ProductStoreRequest): Promise<ProductStoreResponse> {
    return this.post<ProductStoreResponse>('', productStore);
  }

  async updateProductStore(id: number, productStore: ProductStoreRequest): Promise<ProductStoreResponse> {
    return this.put<ProductStoreResponse>(`/${id}`, productStore);
  }

  async deleteProductStore(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// User Activity API - ✅ NUEVO - Faltaba en api.ts anterior
export class UserActivityAPI extends ApiService {
  constructor() {
    super('/user-activities');
  }

  async getAllActivities(): Promise<any[]> {
    return this.get<any[]>('');
  }

  async getActivityById(id: number): Promise<any> {
    return this.get<any>(`/${id}`);
  }

  async createActivity(activity: any): Promise<any> {
    return this.post<any>('', activity);
  }

  async updateActivity(id: number, activity: any): Promise<any> {
    return this.put<any>(`/${id}`, activity);
  }

  async deleteActivity(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Receipt API - ✅ NUEVO - Faltaba en api.ts anterior  
export class ReceiptAPI extends ApiService {
  constructor() {
    super('/receipts');
  }

  async getAllReceipts(): Promise<any[]> {
    return this.get<any[]>('');
  }

  async getReceiptById(id: number): Promise<any> {
    return this.get<any>(`/${id}`);
  }

  async createReceipt(receipt: any): Promise<any> {
    return this.post<any>('', receipt);
  }

  async updateReceipt(id: number, receipt: any): Promise<any> {
    return this.put<any>(`/${id}`, receipt);
  }

  async deleteReceipt(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Health/Info API - ✅ NUEVO - Endpoints de salud que existen
export class HealthAPI extends ApiService {
  constructor() {
    super('');
  }

  async getApiInfo(): Promise<any> {
    return this.get<any>('/api-info');
  }

  async getHealth(): Promise<any> {
    return this.get<any>('/health');
  }
}

// Export API instances (eliminado DashboardAPI que no existe)
export const categoryAPI = new CategoryAPI();
export const productAPI = new ProductAPI();
export const storeAPI = new StoreAPI();
export const clientAPI = new ClientAPI();
export const saleAPI = new SaleAPI();
export const saleDetailAPI = new SaleDetailAPI(); // ✅ NUEVO
export const userAPI = new UserAPI();
export const productBatchAPI = new ProductBatchAPI();
export const inventoryMovementAPI = new InventoryMovementAPI();
export const productStoreAPI = new ProductStoreAPI();
export const userActivityAPI = new UserActivityAPI(); // ✅ NUEVO
export const receiptAPI = new ReceiptAPI(); // ✅ NUEVO
export const healthAPI = new HealthAPI(); // ✅ NUEVO