// src/types/reports.ts - ACTUALIZADO según estructura real del backend

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

// ✅ ACTUALIZADO: Respuestas de reportes según backend real

// ================== REPORTE DE VENTAS ==================
export interface SalesReportResponse {
  period: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByType: SalesByTypeResponse;
  salesByStore: SalesByStoreResponse[];
  topSellingProducts: TopSellingProductResponse[];
  dailySales: DailySalesResponse[];
}

export interface SalesByTypeResponse {
  retail: SalesMetrics;
  wholesale: SalesMetrics;
}

export interface SalesMetrics {
  count: number;
  revenue: number;
  percentage: number;
}

export interface SalesByStoreResponse {
  storeId: number;
  storeName: string;
  salesCount: number;
  revenue: number;
  percentage: number;
}

export interface TopSellingProductResponse {
  productId: number;
  productName: string;
  productCode: string;
  quantitySold: number;
  revenue: number;
  rank: number;
}

export interface DailySalesResponse {
  date: string; // LocalDate se serializa como string
  salesCount: number;
  revenue: number;
}

// ================== REPORTE DE INVENTARIO ==================
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
  alertLevel: string; // LOW, CRITICAL, OUT_OF_STOCK
}

export interface ExpiringBatchResponse {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  storeId?: number;
  storeName?: string;
  expirationDate: string; // LocalDate se serializa como string
  daysUntilExpiration: number;
  currentQuantity: number;
}

// ================== REPORTE DE RENTABILIDAD ==================
export interface ProfitabilityReportResponse {
  period: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  profitByProduct: ProductProfitabilityResponse[];
  profitByCategory: CategoryProfitabilityResponse[];
  profitByStore: StoreProfitabilityResponse[];
}

export interface ProductProfitabilityResponse {
  productId: number;
  productName: string;
  productCode: string;
  quantitySold: number;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
}

export interface CategoryProfitabilityResponse {
  categoryId: number;
  categoryName: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
}

export interface StoreProfitabilityResponse {
  storeId: number;
  storeName: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
}

// ================== REPORTE DE PRODUCTOS MÁS VENDIDOS ==================
export interface BestSellingProductsReportResponse {
  period: string;
  totalProductsSold: number;
  products: BestSellingProductResponse[];
}

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
  marketShare: number; // Porcentaje del total de ventas
}

// ================== REPORTE DE TRAZABILIDAD ==================
export interface TraceabilityReportResponse {
  batchCode: string;
  productId: number;
  productName: string;
  productionDate: string; // LocalDate se serializa como string
  expirationDate: string; // LocalDate se serializa como string
  initialQuantity: number;
  currentQuantity: number;
  movements: BatchMovementResponse[];
  sales: BatchSaleResponse[];
}

export interface BatchMovementResponse {
  movementId: number;
  movementType: string;
  fromStore?: string;
  toStore?: string;
  quantity: number;
  reason: string;
  movementDate: string; // LocalDate se serializa como string
  userEmail: string;
}

export interface BatchSaleResponse {
  saleId: number;
  saleNumber: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  saleDate: string; // LocalDate se serializa como string
  storeName: string;
  clientName?: string;
}

// ================== DASHBOARD EJECUTIVO ==================
export interface ExecutiveDashboardResponse {
  summary: DashboardSummaryResponse;
  kpis: DashboardKPIsResponse;
  trends: DashboardTrendsResponse;
  alerts: DashboardAlertsResponse;
}

export interface DashboardSummaryResponse {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  activeStores: number;
  period: string;
}

export interface DashboardKPIsResponse {
  averageTicket: number;
  conversionRate: number;
  inventoryTurnover: number;
  profitMargin: number;
  customerRetention: number;
}

export interface DashboardTrendsResponse {
  salesTrend: TrendDataPoint[];
  revenueTrend: TrendDataPoint[];
  inventoryTrend: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string; // LocalDate se serializa como string
  value: number;
}

export interface DashboardAlertsResponse {
  lowStockCount: number;
  expiringBatchesCount: number;
  pendingReceiptsCount: number;
  systemAlerts: string[];
}

// ✅ DEPRECADO: Interfaces antiguas (mantener por compatibilidad temporal)
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

// ✅ REQUEST COMÚN PARA FILTROS
export interface ReportFiltersRequest {
  startDate: string; // LocalDate en formato ISO string
  endDate: string; // LocalDate en formato ISO string
  storeIds?: number[];
  categoryIds?: number[];
  productIds?: number[];
}

// ✅ HELPER: Funciones de utilidad para conversión de datos
export const convertSalesReportToLegacy = (report: SalesReportResponse): SalesReportData => ({
  period: report.period,
  totalSales: report.totalSales,
  totalRevenue: report.totalRevenue,
  averageTicket: report.averageTicket,
  salesByStore: report.salesByStore.map(store => ({
    storeName: store.storeName,
    salesCount: store.salesCount,
    revenue: store.revenue
  })),
  salesByProduct: report.topSellingProducts.map(product => ({
    productName: product.productName,
    quantitySold: product.quantitySold,
    revenue: product.revenue
  })),
  dailySales: report.dailySales.map(daily => ({
    date: daily.date,
    sales: daily.salesCount,
    revenue: daily.revenue
  }))
});

export const convertTraceabilityReportToLegacy = (report: TraceabilityReportResponse): TraceabilityReportData => {
  const totalSold = report.sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalMoved = report.movements
    .filter(movement => movement.movementType === 'TRANSFER')
    .reduce((sum, movement) => sum + movement.quantity, 0);

  return {
    batchInfo: {
      batchCode: report.batchCode,
      productName: report.productName,
      productionDate: report.productionDate,
      expirationDate: report.expirationDate,
      initialQuantity: report.initialQuantity,
      currentQuantity: report.currentQuantity
    },
    movements: report.movements.map(movement => ({
      id: movement.movementId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      reason: movement.reason,
      movementDate: movement.movementDate,
      fromStore: movement.fromStore,
      toStore: movement.toStore,
      userName: movement.userEmail,
      notes: undefined
    })),
    sales: report.sales.map(sale => ({
      saleNumber: sale.saleNumber,
      date: sale.saleDate,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      subtotal: sale.subtotal,
      storeName: sale.storeName,
      clientName: sale.clientName
    })),
    summary: {
      totalProduced: report.initialQuantity,
      totalSold,
      totalMoved,
      remaining: report.currentQuantity
    }
  };
};