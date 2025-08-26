// src/types/index.ts (Actualizado según Backend Real)

// ✅ ACTUALIZADO: Enums from backend
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE' // ⚠️ CAMBIO: Antes era USER, ahora EMPLOYEE
}

export enum IdentificationType {
  CEDULA = 'CEDULA',
  PASAPORTE = 'PASAPORTE',
  RUC = 'RUC'
}

export enum StoreType {
  FISICA = 'FISICA',
  MOVIL = 'MOVIL',
  BODEGA = 'BODEGA'
}

export enum SaleType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE'
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER'
}

export enum MovementReason {
  PRODUCTION = 'PRODUCTION',
  SALE = 'SALE',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  EXPIRED = 'EXPIRED'
}

// Base Entity
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category extends BaseEntity {
  name: string;
  description?: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
}

export interface CategoryResponse extends BaseEntity {
  name: string;
  description?: string;
}

// Client Types
export interface Client extends BaseEntity {
  nameLastname: string;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  requiresInvoice: boolean;
  isActive: boolean;
}

export interface ClientRequest {
  nameLastname: string;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  requiresInvoice: boolean;
  isActive: boolean;
}

export interface ClientResponse extends BaseEntity {
  nameLastname: string;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  requiresInvoice: boolean;
  isActive: boolean;
}

// User Types
export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface UserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface UserResponse extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string; // ✅ CAMBIO: LocalDateTime se serializa como string
  updatedAt: string; // ✅ AGREGADO: updatedAt que viene del BaseEntity
}

// ✅ NUEVO: Tipos para la respuesta de creación de Supabase
export interface SupabaseCreateUserResponse {
  id: string;
  email: string;
  createdAt: string;
  emailConfirmedAt?: string;
  userMetadata?: Record<string, any>;
  appMetadata?: Record<string, any>;
  role?: string;
  aud?: string;
  phone?: string;
  phoneConfirmedAt?: string;
  confirmationSentAt?: string;
  recoverySentAt?: string;
  emailChange?: string;
  emailChangeSentAt?: string;
  emailChangeConfirmStatus?: number;
  bannedUntil?: string;
  invitedAt?: string;
  updatedAt?: string;
  lastSignInAt?: string;
}





// ✅ NUEVO: Interface para operaciones de actualización de usuario
export interface UserUpdateRequest {
  name?: string;
  email?: string;
  password?: string; // Opcional para actualizaciones
  role?: UserRole;
  typeIdentification?: IdentificationType;
  identificationNumber?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

// ✅ HELPER: Función para convertir UserResponse a User (si es necesaria)
export const mapUserResponseToUser = (userResponse: UserResponse): User => ({
  id: userResponse.id,
  name: userResponse.name,
  email: userResponse.email,
  role: userResponse.role,
  typeIdentification: userResponse.typeIdentification,
  identificationNumber: userResponse.identificationNumber,
  phoneNumber: userResponse.phoneNumber,
  isActive: userResponse.isActive,
  createdAt: userResponse.createdAt,
  updatedAt: userResponse.updatedAt,
});

// ✅ HELPER: Función para validar UserRequest antes de envío
export const validateUserRequest = (userRequest: UserRequest): string[] => {
  const errors: string[] = [];
  
  if (!userRequest.name?.trim()) {
    errors.push('El nombre es requerido');
  }
  
  if (!userRequest.email?.trim()) {
    errors.push('El email es requerido');
  }
  
  if (!userRequest.password?.trim()) {
    errors.push('La contraseña es requerida');
  }
  
  if (!userRequest.identificationNumber?.trim()) {
    errors.push('El número de identificación es requerido');
  }
  
  if (!Object.values(UserRole).includes(userRequest.role)) {
    errors.push('El rol especificado no es válido');
  }
  
  if (!Object.values(IdentificationType).includes(userRequest.typeIdentification)) {
    errors.push('El tipo de identificación no es válido');
  }
  
  return errors;
};

// ✅ HELPER: Función para debugging de UserRequest
export const debugUserRequest = (userRequest: UserRequest, context: string = 'Unknown'): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`👤 [${context}] UserRequest Debug`);
    console.log('📧 Email:', userRequest.email);
    console.log('👨‍💼 Role:', userRequest.role);
    console.log('🆔 ID Type:', userRequest.typeIdentification);
    console.log('📱 Phone:', userRequest.phoneNumber || 'None');
    console.log('✅ Active:', userRequest.isActive);
    console.log('🔒 Has Password:', userRequest.password ? 'Yes' : 'No');
    console.table({
      name: userRequest.name,
      email: userRequest.email,
      role: userRequest.role,
      identificationType: userRequest.typeIdentification,
      identificationNumber: userRequest.identificationNumber,
      phoneNumber: userRequest.phoneNumber,
      isActive: userRequest.isActive,
      passwordLength: userRequest.password?.length || 0
    });
    console.groupEnd();
  }
};














// Product Types
export interface Product extends BaseEntity {
  code: string;
  nameProduct: string;
  description?: string;
  category: Category;
  flavor?: string;
  size?: string;
  productionCost: number;
  wholesalePrice: number;
  retailPrice: number;
  minStockLevel: number;
  imageUrl?: string;
  barcode?: string;
  isActive: boolean;
}

export interface ProductRequest {
  code: string;
  nameProduct: string;
  description?: string;
  categoryId: number;
  flavor?: string;
  size?: string;
  productionCost: number;
  wholesalePrice: number;
  retailPrice: number;
  minStockLevel: number;
  imageUrl?: string;
  barcode?: string;
  isActive: boolean;
}

export interface ProductResponse extends BaseEntity {
  code: string;
  nameProduct: string;
  description?: string;
  category: CategoryResponse;
  flavor?: string;
  size?: string;
  productionCost: number;
  wholesalePrice: number;
  retailPrice: number;
  minStockLevel: number;
  imageUrl?: string;
  barcode?: string;
  isActive: boolean;
}

// Store Types
export interface Store extends BaseEntity {
  name: string;
  address: string;
  manager?: User;
  typeStore: StoreType;
  phoneNumber?: string;
  scheduleOpen?: string;
  scheduleClosed?: string;
  isActive: boolean;
}

export interface StoreRequest {
  name: string;
  address: string;
  managerId?: number;
  typeStore: StoreType;
  phoneNumber?: string;
  scheduleOpen?: string;
  scheduleClosed?: string;
  isActive: boolean;
}

export interface StoreResponse extends BaseEntity {
  name: string;
  address: string;
  manager?: UserResponse;
  typeStore: StoreType;
  phoneNumber?: string;
  scheduleOpen?: string;
  scheduleClosed?: string;
  isActive: boolean;
}

// ProductBatch Types
export interface ProductBatch extends BaseEntity {
  batchCode: string;
  product: Product;
  productionDate: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  batchCost: number;
  store?: Store;
  isActive: boolean;
}

export interface ProductBatchRequest {
  batchCode: string;
  productId: number;
  productionDate: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  batchCost: number;
  storeId?: number;
  isActive: boolean;
}

export interface ProductBatchResponse extends BaseEntity {
  batchCode: string;
  product: ProductResponse;
  productionDate: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  batchCost: number;
  store?: StoreResponse;
  isActive: boolean;
}

// ProductStore Types
export interface ProductStore extends BaseEntity {
  product: Product;
  store: Store;
  currentStock: number;
  minStockLevel: number;
  lastUpdated: string;
}

export interface ProductStoreRequest {
  productId: number;
  storeId: number;
  currentStock: number;
  minStockLevel: number;
}

export interface ProductStoreResponse extends BaseEntity {
  product: ProductResponse;
  store: StoreResponse;
  currentStock: number;
  minStockLevel: number;
  lastUpdated: string;
}

// Sale Types
export interface Sale extends BaseEntity {
  saleNumber: string;
  user: User;
  client?: Client;
  store: Store;
  saleType: SaleType;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  isInvoiced: boolean;
}

export interface SaleRequest {
  saleNumber: string;
  userId: string;
  clientId?: number;
  storeId: number;
  saleType: SaleType;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  isInvoiced: boolean;
}

export interface SaleResponse extends BaseEntity {
  saleNumber: string;
  user: UserResponse;
  client?: ClientResponse;
  store: StoreResponse;
  saleType: SaleType;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  isInvoiced: boolean;
}

// SaleDetail Types
export interface SaleDetail extends BaseEntity {
  sale: Sale;
  product: Product;
  batch?: ProductBatch;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleDetailRequest {
  saleId: number;
  productId: number;
  batchId?: number;
  quantity: number;
}

export interface SaleDetailResponse extends BaseEntity {
  sale: SaleResponse;
  product: ProductResponse;
  batch?: ProductBatchResponse;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// InventoryMovement Types
export interface InventoryMovement extends BaseEntity {
  movementType: MovementType;
  product: Product;
  batch?: ProductBatch;
  fromStore?: Store;
  toStore?: Store;
  quantity: number;
  reason: MovementReason;
  referenceId?: number;
  referenceType?: string;
  user: User;
  notes?: string;
  movementDate: string;
}

export interface InventoryMovementRequest {
  movementType: MovementType;
  productId: number;
  batchId?: number;
  fromStoreId?: number;
  toStoreId?: number;
  quantity: number;
  reason: MovementReason;
  referenceId?: number;
  referenceType?: string;
  userId: string;
  notes?: string;
}

export interface InventoryMovementResponse extends BaseEntity {
  movementType: MovementType;
  product: ProductResponse;
  batch?: ProductBatchResponse;
  fromStore?: StoreResponse;
  toStore?: StoreResponse;
  quantity: number;
  reason: MovementReason;
  referenceId?: number;
  referenceType?: string;
  user: UserResponse;
  notes?: string;
  movementDate: string;
}

// UserActivity Types
export interface UserActivity extends BaseEntity {
  user: User;
  activityType: string;
  description: string;
  entityType?: string;
  entityId?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface UserActivityRequest {
  userId: string;
  activityType: string;
  description: string;
  entityType?: string;
  entityId?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserActivityResponse extends BaseEntity {
  user: UserResponse;
  activityType: string;
  description: string;
  entityType?: string;
  entityId?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Receipt Types
export interface Receipt extends BaseEntity {
  receiptNumber: string;
  sale: Sale;
  issueDate: string;
  customerName?: string;
  customerIdentification?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  isVoided: boolean;
}

export interface ReceiptRequest {
  receiptNumber: string;
  saleId: number;
  customerName?: string;
  customerIdentification?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ReceiptResponse extends BaseEntity {
  receiptNumber: string;
  sale: SaleResponse;
  issueDate: string;
  customerName?: string;
  customerIdentification?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  isVoided: boolean;
}

// ✅ NUEVOS TIPOS PARA REPORTS API
export interface SalesReportResponse {
  period: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByStore: Array<{
    storeName: string;
    salesCount: number;
    revenue: number;
  }>;
  salesByProduct: Array<{
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

// ✅ Tipo correcto según el backend
export interface InventoryReportResponse {
  totalProducts: number;
  totalValue: number;
  stockAlerts: InventoryAlertsResponse;
  inventoryByStore: InventoryByStoreResponse[];
  inventoryByCategory: InventoryByCategoryResponse[];
  lowStockProducts: LowStockProductResponse[];
  expiringBatches: ExpiringBatchResponse[];
}

export interface InventoryAlertsResponse {
  lowStock: number;
  outOfStock: number;
  critical: number;
  expiringSoon: number;
}

export interface InventoryByStoreResponse {
  storeId: number;
  storeName: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
}

export interface InventoryByCategoryResponse {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
}

export interface LowStockProductResponse {
  productId: number;
  productName: string;
  productCode: string;
  storeId: number;
  storeName: string;
  currentStock: number;
  minStockLevel: number;
  alertLevel: string;
}

export interface ExpiringBatchResponse {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  storeId?: number;
  storeName?: string;
  expirationDate: string;
  daysUntilExpiration: number;
  currentQuantity: number;
}



export interface ProfitabilityReportResponse {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  profitabilityByProduct: Array<{
    productName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
    unitsSold: number;
  }>;
  profitabilityByStore: Array<{
    storeName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }>;
}

export interface BestSellingProductsReportResponse {
  period: string;
  totalProductsSold: number;
  products: Array<{
    rank: number;
    productId: number;
    productName: string;
    productCode: string;
    categoryName: string;
    quantitySold: number;
    revenue: number;
    averagePrice: number;
    salesCount: number;
    marketShare: number;
  }>;
}

export interface TraceabilityReportResponse {
  batchInfo: {
    batchCode: string;
    productName: string;
    productionDate: string;
    expirationDate: string;
    initialQuantity: number;
    currentQuantity: number;
  } | null;
  movements: Array<{
    id: number;
    movementType: string;
    quantity: number;
    reason: string;
    movementDate: string;
    fromStore?: string;
    toStore?: string;
    userName: string;
    notes?: string;
  }>;
  sales: Array<{
    saleNumber: string;
    date: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    storeName: string;
    clientName?: string;
  }>;
  summary: {
    totalProduced: number;
    totalSold: number;
    totalMoved: number;
    remaining: number;
  };
}

export interface ExecutiveDashboardResponse {
  period: string;
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  profitMargin: number;
  topProducts: Array<{
    productName: string;
    revenue: number;
    quantitySold: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  storePerformance: Array<{
    storeName: string;
    sales: number;
    revenue: number;
    profit: number;
  }>;
}

import { DashboardAlertsResponse, DashboardKPIsResponse
, DashboardSummaryResponse, DashboardTrendsResponse,
 } from "./reports";

export interface ExecutiveDashboardResponse {
  summary: DashboardSummaryResponse;
  kpis: DashboardKPIsResponse;
  trends: DashboardTrendsResponse;
  alerts: DashboardAlertsResponse;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// Complete Sale with Receipt Request
export interface CompleteSaleWithReceiptRequest {
  paymentMethod?: string;
  additionalNotes?: string;
}

// Health/Info API Responses
export interface ApiInfoResponse {
  application: string;
  version: string;
  status: string;
  timestamp: string;
  endpoints: Record<string, string>;
  documentation: string;
  support: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface StockAlert {
  id: number;
  product: ProductResponse;
  store: StoreResponse;
  currentStock: number;
  minStockLevel: number;
  alertLevel: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  createdAt: string;
}

export interface BatchFilters {
  storeId: string;
  productId: string;
  showExpiring: boolean;
  showLowStock: boolean;
}


// ✅ NUEVA: Para respuesta de verificación de stock
export interface StockCheckResponse {
  available: number;
  productId: number;
  productName: string;
}