// src/types/index.ts

// Enums from backend
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
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

// Base Entity interface
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
  passwordHash: string;
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
  userId: number;
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

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// Pagination
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Search and Filter types
export interface ProductFilters {
  search?: string;
  categoryId?: number;
  flavor?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface InventoryFilters {
  storeId?: number;
  productId?: number;
  movementType?: MovementType;
  reason?: MovementReason;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// Stock Alert
export interface StockAlert {
  product: ProductResponse;
  store: StoreResponse;
  currentStock: number;
  minStockLevel: number;
  alertLevel: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

// Dashboard data
export interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalStores: number;
  lowStockAlerts: number;
  recentMovements: InventoryMovementResponse[];
  stockAlerts: StockAlert[];
}

// UI Component prop types
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

// Error types
export interface ApiErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  path: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Notification types
export interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}