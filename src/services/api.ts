// src/services/api.ts (CORREGIDO - URLs y Headers)
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
  SalesReportResponse,
  InventoryReportResponse,
  ProfitabilityReportResponse,
  BestSellingProductsReportResponse,
  TraceabilityReportResponse,
  ExecutiveDashboardResponse,
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
    // ✅ Usar el proxy same-origin. Nada de IPs aquí.
    this.baseUrl = `/api${endpoint}`;
    console.log(`🌐 API Service initialized for: ${this.baseUrl}`);
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
      console.log('🔑 Token incluido en headers');
    } else {
      console.warn('⚠️ No hay token de autenticación');
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
    console.log(`📤 POST Data:`, data);
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

// Category API
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

// Product API
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

// Store API
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

// Client API
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

// Sale API
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

  // ✅ NUEVO: Verificar stock disponible antes de venta
  async checkProductStock(productId: number): Promise<{ available: number }> {
    return this.get<{ available: number }>(`/products/${productId}/stock`);
  }

  async completeWithReceipt(
    id: number, 
    data: { paymentMethod?: string; additionalNotes?: string }
  ): Promise<any> {
    return this.post<any>(`/${id}/complete-with-receipt`, data);
  }
}

// Sale Detail API
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

// User API
// export class UserAPI extends ApiService {
//   constructor() {
//     super('/users');
//   }

//   async getAllUsers(): Promise<UserResponse[]> {
//     return this.get<UserResponse[]>('');
//   }

//   async getUserById(id: number): Promise<UserResponse> {
//     return this.get<UserResponse>(`/${id}`);
//   }

//   async createUser(user: UserRequest): Promise<UserResponse> {
//     return this.post<UserResponse>('', user);
//   }

//   async updateUser(id: number, user: UserRequest): Promise<UserResponse> {
//     return this.put<UserResponse>(`/${id}`, user);
//   }

//   async deleteUser(id: number): Promise<void> {
//     return this.delete<void>(`/${id}`);
//   }
// }



// src/services/api.ts - SECCIÓN UserAPI ACTUALIZADA

// User API
export class UserAPI extends ApiService {
  constructor() {
    super('/users');
    console.log('👤 UserAPI initialized');
  }

  async getAllUsers(): Promise<UserResponse[]> {
    console.log('📋 Getting all users...');
    try {
      const users = await this.get<UserResponse[]>('');
      console.log(`✅ Retrieved ${users.length} users`);
      return users;
    } catch (error) {
      console.error('❌ Error getting users:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<UserResponse> {
    console.log(`🔍 Getting user by ID: ${id}`);
    try {
      const user = await this.get<UserResponse>(`/${id}`);
      console.log('✅ User retrieved:', user.email);
      return user;
    } catch (error) {
      console.error(`❌ Error getting user ${id}:`, error);
      throw error;
    }
  }

  async createUser(user: UserRequest): Promise<UserResponse> {
    console.log('👤 Creating new user...');
    console.log('📤 User data being sent:', {
      name: user.name,
      email: user.email,
      role: user.role,
      typeIdentification: user.typeIdentification,
      identificationNumber: user.identificationNumber,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0
    });

    // ✅ VALIDACIÓN: Verificar que los datos requeridos estén presentes
    if (!user.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!user.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!user.password?.trim()) {
      throw new Error('Password is required');
    }
    if (!user.identificationNumber?.trim()) {
      throw new Error('Identification number is required');
    }

    try {
      // ✅ ESTRUCTURA CORRECTA: Enviar exactamente lo que espera el backend
      const requestData: UserRequest = {
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        password: user.password, // ✅ 'password', no 'passwordHash'
        role: user.role,
        typeIdentification: user.typeIdentification,
        identificationNumber: user.identificationNumber.trim(),
        phoneNumber: user.phoneNumber?.trim() || undefined,
        isActive: user.isActive
      };

      console.log('🚀 Final request data structure:', requestData);

      const createdUser = await this.post<UserResponse>('', requestData);
      
      console.log('✅ User created successfully:', {
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role
      });
      
      return createdUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // ✅ MEJOR MANEJO DE ERRORES: Extraer mensaje específico del backend
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Mapear errores comunes del backend
        if (errorMessage.includes('email already exists') || errorMessage.includes('duplicate key')) {
          throw new Error('Este email ya está registrado en el sistema');
        }
        if (errorMessage.includes('identification number already exists')) {
          throw new Error('Este número de identificación ya está registrado');
        }
        if (errorMessage.includes('400')) {
          throw new Error('Datos inválidos. Verifica que todos los campos estén correctos.');
        }
        if (errorMessage.includes('401')) {
          throw new Error('No tienes permisos para crear usuarios');
        }
        if (errorMessage.includes('403')) {
          throw new Error('Acceso denegado para esta operación');
        }
      }
      
      throw error;
    }
  }

  async updateUser(id: number, user: UserRequest): Promise<UserResponse> {
    console.log(`📝 Updating user ID: ${id}`);
    console.log('📤 Update data:', {
      name: user.name,
      email: user.email,
      role: user.role,
      typeIdentification: user.typeIdentification,
      identificationNumber: user.identificationNumber,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      hasPassword: !!user.password && user.password !== 'KEEP_CURRENT_PASSWORD'
    });

    try {
      // ✅ ESTRUCTURA CORRECTA: Para actualizaciones
      const updateData: UserRequest = {
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        password: user.password === 'KEEP_CURRENT_PASSWORD' ? '' : user.password, // Backend manejará contraseña vacía
        role: user.role,
        typeIdentification: user.typeIdentification,
        identificationNumber: user.identificationNumber.trim(),
        phoneNumber: user.phoneNumber?.trim() || undefined,
        isActive: user.isActive
      };

      console.log('🚀 Final update data structure:', updateData);

      const updatedUser = await this.put<UserResponse>(`/${id}`, updateData);
      
      console.log('✅ User updated successfully:', {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      });
      
      return updatedUser;
    } catch (error) {
      console.error(`❌ Error updating user ${id}:`, error);
      
      // Manejo de errores específicos para actualización
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('email already exists')) {
          throw new Error('Este email ya está en uso por otro usuario');
        }
        if (errorMessage.includes('identification number already exists')) {
          throw new Error('Este número de identificación ya está en uso');
        }
        if (errorMessage.includes('404')) {
          throw new Error('Usuario no encontrado');
        }
        if (errorMessage.includes('403')) {
          throw new Error('No tienes permisos para actualizar este usuario');
        }
      }
      
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    console.log(`🗑️ Deleting user ID: ${id}`);
    try {
      await this.delete<void>(`/${id}`);
      console.log('✅ User deleted successfully');
    } catch (error) {
      console.error(`❌ Error deleting user ${id}:`, error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('404')) {
          throw new Error('Usuario no encontrado');
        }
        if (errorMessage.includes('403')) {
          throw new Error('No tienes permisos para eliminar usuarios');
        }
        if (errorMessage.includes('409')) {
          throw new Error('No se puede eliminar este usuario porque tiene datos relacionados');
        }
      }
      
      throw error;
    }
  }
}





// Product Batch API
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

// ✅ CORREGIDO: Inventory Movement API con logging detallado
export class InventoryMovementAPI extends ApiService {
  constructor() {
    super('/inventory-movements');
    console.log('📦 InventoryMovementAPI initialized');
  }

  async getAllMovements(): Promise<InventoryMovementResponse[]> {
    return this.get<InventoryMovementResponse[]>('');
  }

  async getMovementById(id: number): Promise<InventoryMovementResponse> {
    return this.get<InventoryMovementResponse>(`/${id}`);
  }

  async createMovement(movement: InventoryMovementRequest): Promise<InventoryMovementResponse> {
    console.log('📤 Creating inventory movement:', movement);
    
    // ✅ VALIDACIÓN: Verificar que el userId no esté vacío o sea 0
  if (!movement.userId || movement.userId === '0' || movement.userId.trim() === '') {
    throw new ApiError('ID de usuario es requerido y debe ser válido', 400);
  }
    
    return this.post<InventoryMovementResponse>('', movement);
  }

  async updateMovement(id: number, movement: InventoryMovementRequest): Promise<InventoryMovementResponse> {
    return this.put<InventoryMovementResponse>(`/${id}`, movement);
  }

  async deleteMovement(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

// Product Store API
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

// User Activity API
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

// Receipt API
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

// Health/Info API
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

// Reports API
export class ReportsAPI extends ApiService {
  constructor() {
    super('/reports');
  }

  async getSalesReport(
    startDate: string,
    endDate: string,
    storeIds?: number[]
  ): Promise<SalesReportResponse> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    if (storeIds && storeIds.length > 0) {
      storeIds.forEach(id => params.append('storeIds', id.toString()));
    }

    return this.get<SalesReportResponse>(`/sales?${params.toString()}`);
  }

  async getInventoryReport(
    storeIds?: number[],
    categoryIds?: number[]
  ): Promise<InventoryReportResponse> {
    const params = new URLSearchParams();
    
    if (storeIds && storeIds.length > 0) {
      storeIds.forEach(id => params.append('storeIds', id.toString()));
    }
    
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categoryIds', id.toString()));
    }

    const queryString = params.toString();
    return this.get<InventoryReportResponse>(`/inventory${queryString ? '?' + queryString : ''}`);
  }

  async getProfitabilityReport(
    startDate: string,
    endDate: string,
    storeIds?: number[],
    categoryIds?: number[]
  ): Promise<ProfitabilityReportResponse> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    if (storeIds && storeIds.length > 0) {
      storeIds.forEach(id => params.append('storeIds', id.toString()));
    }
    
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categoryIds', id.toString()));
    }

    return this.get<ProfitabilityReportResponse>(`/profitability?${params.toString()}`);
  }

  async getBestSellingProductsReport(
    startDate: string,
    endDate: string,
    limit: number = 20,
    storeIds?: number[],
    categoryIds?: number[]
  ): Promise<BestSellingProductsReportResponse> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      limit: limit.toString()
    });
    
    if (storeIds && storeIds.length > 0) {
      storeIds.forEach(id => params.append('storeIds', id.toString()));
    }
    
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categoryIds', id.toString()));
    }

    return this.get<BestSellingProductsReportResponse>(`/best-selling-products?${params.toString()}`);
  }

  async getTraceabilityReportByBatch(batchCode: string): Promise<TraceabilityReportResponse> {
    return this.get<TraceabilityReportResponse>(`/traceability/batch/${encodeURIComponent(batchCode)}`);
  }

  async getTraceabilityReportByProduct(
    productId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TraceabilityReportResponse[]> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    return this.get<TraceabilityReportResponse[]>(
      `/traceability/product/${productId}${queryString ? '?' + queryString : ''}`
    );
  }

  async getExecutiveDashboard(
    startDate: string,
    endDate: string
  ): Promise<ExecutiveDashboardResponse> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    return this.get<ExecutiveDashboardResponse>(`/executive-dashboard?${params.toString()}`);
  }

  async getSalesSummary(days: number = 30): Promise<any> {
    return this.get<any>(`/summary/sales?days=${days}`);
  }

  async getAvailablePeriods(): Promise<string[]> {
    return this.get<string[]>('/periods');
  }

  async getReportFilters(): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/filters');
  }
}

// Export API instances
export const categoryAPI = new CategoryAPI();
export const productAPI = new ProductAPI();
export const storeAPI = new StoreAPI();
export const clientAPI = new ClientAPI();
export const saleAPI = new SaleAPI();
export const saleDetailAPI = new SaleDetailAPI();
export const userAPI = new UserAPI();
export const productBatchAPI = new ProductBatchAPI();
export const inventoryMovementAPI = new InventoryMovementAPI();
export const productStoreAPI = new ProductStoreAPI();
export const userActivityAPI = new UserActivityAPI();
export const receiptAPI = new ReceiptAPI();
export const healthAPI = new HealthAPI();
export const reportsAPI = new ReportsAPI();
