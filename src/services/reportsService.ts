// src/services/reportsService.ts (NUEVO - USAR ENDPOINTS DE REPORTS API)
import { 
  SalesReportResponse,
  InventoryReportResponse,
  ProfitabilityReportResponse,
  BestSellingProductsReportResponse,
  TraceabilityReportResponse,
  ExecutiveDashboardResponse,
  ReportFilters 
} from '@/types/reports';
import { reportsAPI } from '@/services/api';

class ReportsService {
  // ✅ NUEVO: Usar endpoint directo de sales report
  async generateSalesReport(filters: ReportFilters): Promise<SalesReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    
    return await reportsAPI.getSalesReport(
      filters.startDate,
      filters.endDate,
      storeIds
    );
  }

  // ✅ NUEVO: Usar endpoint directo de inventory report
  async generateInventoryReport(storeId?: number, categoryId?: number): Promise<InventoryReportResponse> {
    const storeIds = storeId ? [storeId] : undefined;
    const categoryIds = categoryId ? [categoryId] : undefined;
    
    return await reportsAPI.getInventoryReport(storeIds, categoryIds);
  }

  // ✅ NUEVO: Usar endpoint directo de profitability report
  async generateProfitabilityReport(filters: ReportFilters): Promise<ProfitabilityReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    const categoryIds = filters.categoryId ? [filters.categoryId] : undefined;
    
    return await reportsAPI.getProfitabilityReport(
      filters.startDate,
      filters.endDate,
      storeIds,
      categoryIds
    );
  }

  // ✅ NUEVO: Usar endpoint directo de best selling products
  async generateTopProductsReport(
    filters: ReportFilters, 
    topCount: number = 20
  ): Promise<BestSellingProductsReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    const categoryIds = filters.categoryId ? [filters.categoryId] : undefined;
    
    return await reportsAPI.getBestSellingProductsReport(
      filters.startDate,
      filters.endDate,
      topCount,
      storeIds,
      categoryIds
    );
  }

  // ✅ NUEVO: Usar endpoint directo de traceability
  async generateTraceabilityReport(batchCode: string): Promise<TraceabilityReportResponse> {
    if (!batchCode || batchCode.trim() === '') {
      throw new Error('Código de lote es requerido');
    }

    return await reportsAPI.getTraceabilityReportByBatch(batchCode.trim());
  }

  // ✅ NUEVO: Traceability por producto
  async generateTraceabilityReportByProduct(
    productId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TraceabilityReportResponse[]> {
    if (!productId) {
      throw new Error('ID del producto es requerido');
    }

    return await reportsAPI.getTraceabilityReportByProduct(productId, startDate, endDate);
  }

  // ✅ NUEVO: Dashboard ejecutivo (solo ADMIN)
  async generateExecutiveDashboard(
    startDate: string,
    endDate: string
  ): Promise<ExecutiveDashboardResponse> {
    if (!startDate || !endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    return await reportsAPI.getExecutiveDashboard(startDate, endDate);
  }

  // ✅ NUEVO: Resumen rápido de ventas
  async getSalesSummary(days: number = 30): Promise<any> {
    return await reportsAPI.getSalesSummary(days);
  }

  // ✅ NUEVO: Obtener períodos disponibles
  async getAvailablePeriods(): Promise<string[]> {
    return await reportsAPI.getAvailablePeriods();
  }

  // ✅ NUEVO: Obtener filtros disponibles
  async getReportFilters(): Promise<Record<string, any>> {
    return await reportsAPI.getReportFilters();
  }

  // ✅ HELPER: Validar rango de fechas
  validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin');
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      throw new Error('El rango de fechas no puede ser mayor a 365 días');
    }
  }

  // ✅ HELPER: Formatear filtros para URLs
  formatFiltersForAPI(filters: ReportFilters): Record<string, any> {
    const apiFilters: Record<string, any> = {};
    
    if (filters.startDate) apiFilters.startDate = filters.startDate;
    if (filters.endDate) apiFilters.endDate = filters.endDate;
    if (filters.storeId) apiFilters.storeIds = [filters.storeId];
    if (filters.categoryId) apiFilters.categoryIds = [filters.categoryId];
    if (filters.productId) apiFilters.productId = filters.productId;
    
    return apiFilters;
  }

  // ✅ HELPER: Exportar a CSV (mantener función útil)
  exportToCSV(data: any[][], filename: string): void {
    const csvContent = data.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // ✅ HELPER: Formatear datos de sales report para CSV
  formatSalesReportForCSV(report: SalesReportResponse): string[][] {
    const data = [
      ['Reporte de Ventas', report.period],
      [''],
      ['Métricas Generales'],
      ['Total de Ventas', report.totalSales.toString()],
      ['Ingresos Totales', report.totalRevenue.toString()],
      ['Ticket Promedio', report.averageTicket.toString()],
      [''],
      ['Ventas por Tienda'],
      ['Tienda', 'Cantidad de Ventas', 'Ingresos'],
      ...report.salesByStore.map(store => [
        store.storeName,
        store.salesCount.toString(),
        store.revenue.toString()
      ]),
      [''],
      ['Productos Más Vendidos'],
      ['Producto', 'Cantidad Vendida', 'Ingresos'],
      ...report.salesByProduct.map(product => [
        product.productName,
        product.quantitySold.toString(),
        product.revenue.toString()
      ])
    ];

    return data;
  }

  // ✅ HELPER: Formatear datos de inventory report para CSV
  formatInventoryReportForCSV(report: InventoryReportResponse): string[][] {
    const data = [
      ['Reporte de Inventario'],
      [''],
      ['Métricas Generales'],
      ['Total de Productos', report.totalProducts.toString()],
      ['Productos con Stock Bajo', report.lowStockProducts.toString()],
      ['Productos Vencidos', report.expiredProducts.toString()],
      ['Valor Total del Stock', report.totalStockValue.toString()],
      [''],
      ['Inventario por Tienda'],
      ['Tienda', 'Cantidad de Productos', 'Stock Total', 'Valor del Stock'],
      ...report.inventoryByStore.map(store => [
        store.storeName,
        store.productsCount.toString(),
        store.totalStock.toString(),
        store.stockValue.toString()
      ]),
      [''],
      ['Rotación de Productos'],
      ['Producto', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Días de Stock'],
      ...report.productRotation.map(product => [
        product.productName,
        product.currentStock.toString(),
        product.minStockLevel.toString(),
        product.status,
        product.daysOfStock.toString()
      ])
    ];

    return data;
  }
}

export const reportsService = new ReportsService();