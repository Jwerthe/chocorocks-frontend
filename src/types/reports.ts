// src/types/reports.ts

export interface SalesReportData {
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

export interface InventoryReportData {
  totalProducts: number;
  lowStockProducts: number;
  expiredProducts: number;
  totalStockValue: number;
  inventoryByStore: Array<{
    storeName: string;
    productsCount: number;
    totalStock: number;
    stockValue: number;
  }>;
  productRotation: Array<{
    productName: string;
    currentStock: number;
    minStockLevel: number;
    status: 'normal' | 'low' | 'critical';
    daysOfStock: number;
  }>;
  expiredBatches: Array<{
    batchCode: string;
    productName: string;
    expirationDate: string;
    quantity: number;
  }>;
}

export interface ProfitabilityReportData {
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

export interface TopProductsReportData {
  reportPeriod: string;
  topProducts: Array<{
    productName: string;
    category: string;
    totalQuantitySold: number;
    totalRevenue: number;
    salesCount: number;
    averagePrice: number;
    rank: number;
  }>;
  categoryPerformance: Array<{
    categoryName: string;
    totalQuantitySold: number;
    totalRevenue: number;
    productsCount: number;
  }>;
}

export interface TraceabilityReportData {
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

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  storeId?: number;
  productId?: number;
  categoryId?: number;
  batchCode?: string;
}

export interface ReportProps {
  onClose?: () => void;
}

export interface ReportCardProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

// ⚠️ AGREGAR AL FINAL de types/reports.ts

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  storeId?: number;
  productId?: number;
  categoryId?: number;
  batchCode?: string;
}

export interface ReportProps {
  onClose?: () => void;
}

export interface ReportCardProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

// ✅ NUEVOS TIPOS para respuestas específicas del backend
export interface BestSellingProductResponse {
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
}

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

export interface InventoryReportResponse {
  totalProducts: number;
  lowStockProducts: number;
  expiredProducts: number;
  totalStockValue: number;
  inventoryByStore: Array<{
    storeName: string;
    productsCount: number;
    totalStock: number;
    stockValue: number;
  }>;
  productRotation: Array<{
    productName: string;
    currentStock: number;
    minStockLevel: number;
    status: 'normal' | 'low' | 'critical';
    daysOfStock: number;
  }>;
  expiredBatches: Array<{
    batchCode: string;
    productName: string;
    expirationDate: string;
    quantity: number;
  }>;
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
  products: BestSellingProductResponse[];
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