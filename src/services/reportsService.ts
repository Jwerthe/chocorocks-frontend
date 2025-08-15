// src/services/reportsService.ts - ACTUALIZADO para estructura real del backend
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
  // ✅ CORREGIDO: Usar endpoint directo de sales report con validaciones
  async generateSalesReport(filters: ReportFilters): Promise<SalesReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    
    try {
      const report = await reportsAPI.getSalesReport(
        filters.startDate,
        filters.endDate,
        storeIds
      );

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend
      return {
        period: report.period || `${filters.startDate} - ${filters.endDate}`,
        totalSales: report.totalSales || 0,
        totalRevenue: report.totalRevenue || 0,
        averageTicket: report.averageTicket || 0,
        salesByType: report.salesByType || {
          retail: { count: 0, revenue: 0, percentage: 0 },
          wholesale: { count: 0, revenue: 0, percentage: 0 }
        },
        salesByStore: report.salesByStore || [],
        topSellingProducts: report.topSellingProducts || [],
        dailySales: report.dailySales || []
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Error al generar el reporte de ventas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Usar endpoint directo de inventory report con validaciones
  async generateInventoryReport(storeId?: number, categoryId?: number): Promise<InventoryReportResponse> {
    const storeIds = storeId ? [storeId] : undefined;
    const categoryIds = categoryId ? [categoryId] : undefined;
    
    try {
      const report = await reportsAPI.getInventoryReport(storeIds, categoryIds);

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend
      return {
        totalProducts: report.totalProducts || 0,
        totalValue: report.totalValue || 0,
        stockAlerts: report.stockAlerts || {
          lowStock: 0,
          outOfStock: 0,
          critical: 0,
          expiringSoon: 0
        },
        inventoryByStore: report.inventoryByStore || [],
        inventoryByCategory: report.inventoryByCategory || [],
        lowStockProducts: report.lowStockProducts || [],
        expiringBatches: report.expiringBatches || []
      };
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw new Error('Error al generar el reporte de inventario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Usar endpoint directo de profitability report con validaciones
  async generateProfitabilityReport(filters: ReportFilters): Promise<ProfitabilityReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    const categoryIds = filters.categoryId ? [filters.categoryId] : undefined;
    
    try {
      const report = await reportsAPI.getProfitabilityReport(
        filters.startDate,
        filters.endDate,
        storeIds,
        categoryIds
      );

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend
      return {
        period: report.period || `${filters.startDate} - ${filters.endDate}`,
        totalRevenue: report.totalRevenue || 0,
        totalCosts: report.totalCosts || 0,
        grossProfit: report.grossProfit || 0,
        profitMargin: report.profitMargin || 0,
        profitByProduct: report.profitByProduct || [],
        profitByCategory: report.profitByCategory || [],
        profitByStore: report.profitByStore || []
      };
    } catch (error) {
      console.error('Error generating profitability report:', error);
      throw new Error('Error al generar el reporte de rentabilidad: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Usar endpoint directo de best selling products con validaciones
  async generateTopProductsReport(
    filters: ReportFilters, 
    topCount: number = 20
  ): Promise<BestSellingProductsReportResponse> {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    const storeIds = filters.storeId ? [filters.storeId] : undefined;
    const categoryIds = filters.categoryId ? [filters.categoryId] : undefined;
    
    try {
      const report = await reportsAPI.getBestSellingProductsReport(
        filters.startDate,
        filters.endDate,
        topCount,
        storeIds,
        categoryIds
      );

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend
      return {
        period: report.period || `${filters.startDate} - ${filters.endDate}`,
        totalProductsSold: report.totalProductsSold || 0,
        products: report.products || []
      };
    } catch (error) {
      console.error('Error generating top products report:', error);
      throw new Error('Error al generar el reporte de productos más vendidos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Usar endpoint directo de traceability con validaciones
  async generateTraceabilityReport(batchCode: string): Promise<TraceabilityReportResponse> {
    if (!batchCode || batchCode.trim() === '') {
      throw new Error('Código de lote es requerido');
    }

    try {
      const report = await reportsAPI.getTraceabilityReportByBatch(batchCode.trim());

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend
      return {
        batchCode: report.batchCode || batchCode,
        productId: report.productId || 0,
        productName: report.productName || 'N/A',
        productionDate: report.productionDate || '',
        expirationDate: report.expirationDate || '',
        initialQuantity: report.initialQuantity || 0,
        currentQuantity: report.currentQuantity || 0,
        movements: report.movements || [],
        sales: report.sales || []
      };
    } catch (error) {
      console.error('Error generating traceability report:', error);
      throw new Error('Error al generar el reporte de trazabilidad: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Traceability por producto con validaciones
  async generateTraceabilityReportByProduct(
    productId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TraceabilityReportResponse[]> {
    if (!productId) {
      throw new Error('ID del producto es requerido');
    }

    try {
      const reports = await reportsAPI.getTraceabilityReportByProduct(productId, startDate, endDate);

      // ✅ VALIDACIÓN: Asegurar estructura correcta para cada reporte
      return reports.map(report => ({
        batchCode: report.batchCode || '',
        productId: report.productId || productId,
        productName: report.productName || 'N/A',
        productionDate: report.productionDate || '',
        expirationDate: report.expirationDate || '',
        initialQuantity: report.initialQuantity || 0,
        currentQuantity: report.currentQuantity || 0,
        movements: report.movements || [],
        sales: report.sales || []
      }));
    } catch (error) {
      console.error('Error generating traceability report by product:', error);
      throw new Error('Error al generar el reporte de trazabilidad por producto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Dashboard ejecutivo con estructura real del backend
  async generateExecutiveDashboard(
    startDate: string,
    endDate: string
  ): Promise<ExecutiveDashboardResponse> {
    if (!startDate || !endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    try {
      const dashboard = await reportsAPI.getExecutiveDashboard(startDate, endDate);

      // ✅ VALIDACIÓN: Asegurar estructura correcta según backend real
      return {
        summary: dashboard.summary || {
          totalRevenue: 0,
          totalSales: 0,
          totalProducts: 0,
          activeStores: 0,
          period: `${startDate} - ${endDate}`
        },
        kpis: dashboard.kpis || {
          averageTicket: 0,
          conversionRate: 0,
          inventoryTurnover: 0,
          profitMargin: 0,
          customerRetention: 0
        },
        trends: dashboard.trends || {
          salesTrend: [],
          revenueTrend: [],
          inventoryTrend: []
        },
        alerts: dashboard.alerts || {
          lowStockCount: 0,
          expiringBatchesCount: 0,
          pendingReceiptsCount: 0,
          systemAlerts: []
        }
      };
    } catch (error) {
      console.error('Error generating executive dashboard:', error);
      throw new Error('Error al generar el dashboard ejecutivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Resumen rápido de ventas con validaciones
  async getSalesSummary(days: number = 30): Promise<any> {
    try {
      return await reportsAPI.getSalesSummary(days);
    } catch (error) {
      console.error('Error getting sales summary:', error);
      throw new Error('Error al obtener el resumen de ventas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ CORREGIDO: Obtener períodos disponibles con validaciones
  async getAvailablePeriods(): Promise<string[]> {
    try {
      return await reportsAPI.getAvailablePeriods();
    } catch (error) {
      console.error('Error getting available periods:', error);
      return [];
    }
  }

  // ✅ CORREGIDO: Obtener filtros disponibles con validaciones
  async getReportFilters(): Promise<Record<string, any>> {
    try {
      return await reportsAPI.getReportFilters();
    } catch (error) {
      console.error('Error getting report filters:', error);
      return {};
    }
  }

  // ✅ HELPER: Validar rango de fechas
  validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Las fechas proporcionadas no son válidas');
    }
    
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
      row.map(cell => {
        // Manejar diferentes tipos de datos
        let cellValue = '';
        if (cell === null || cell === undefined) {
          cellValue = '';
        } else if (typeof cell === 'object') {
          cellValue = JSON.stringify(cell);
        } else {
          cellValue = String(cell);
        }
        
        // Escapar comillas y encapsular si contiene comas
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          cellValue = `"${cellValue.replace(/"/g, '""')}"`;
        }
        
        return cellValue;
      }).join(',')
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

  // ✅ HELPER: Formatear datos de sales report para CSV según estructura real
  formatSalesReportForCSV(report: SalesReportResponse): string[][] {
    const data = [
      ['Reporte de Ventas', report.period || 'N/A'],
      [''],
      ['Métricas Generales'],
      ['Total de Ventas', (report.totalSales || 0).toString()],
      ['Ingresos Totales', (report.totalRevenue || 0).toString()],
      ['Ticket Promedio', (report.averageTicket || 0).toString()],
      [''],
      ['Ventas por Tipo'],
      ['Tipo', 'Cantidad', 'Ingresos', 'Porcentaje'],
      ['Al Por Menor', (report.salesByType?.retail?.count || 0).toString(), (report.salesByType?.retail?.revenue || 0).toString(), (report.salesByType?.retail?.percentage || 0).toString() + '%'],
      ['Al Por Mayor', (report.salesByType?.wholesale?.count || 0).toString(), (report.salesByType?.wholesale?.revenue || 0).toString(), (report.salesByType?.wholesale?.percentage || 0).toString() + '%'],
      [''],
      ['Ventas por Tienda'],
      ['Tienda', 'Cantidad de Ventas', 'Ingresos', 'Porcentaje'],
      ...(report.salesByStore || []).map(store => [
        store.storeName || 'N/A',
        (store.salesCount || 0).toString(),
        (store.revenue || 0).toString(),
        (store.percentage || 0).toString() + '%'
      ]),
      [''],
      ['Productos Más Vendidos'],
      ['Producto', 'Código', 'Cantidad Vendida', 'Ingresos', 'Ranking'],
      ...(report.topSellingProducts || []).map(product => [
        product.productName || 'N/A',
        product.productCode || 'N/A',
        (product.quantitySold || 0).toString(),
        (product.revenue || 0).toString(),
        (product.rank || 0).toString()
      ]),
      [''],
      ['Ventas Diarias'],
      ['Fecha', 'Cantidad de Ventas', 'Ingresos'],
      ...(report.dailySales || []).map(daily => [
        daily.date || 'N/A',
        (daily.salesCount || 0).toString(),
        (daily.revenue || 0).toString()
      ])
    ];

    return data;
  }

  // ✅ HELPER: Formatear datos de inventory report para CSV según estructura real
  formatInventoryReportForCSV(report: InventoryReportResponse): string[][] {
    const data = [
      ['Reporte de Inventario'],
      [''],
      ['Métricas Generales'],
      ['Total de Productos', (report.totalProducts || 0).toString()],
      ['Valor Total', (report.totalValue || 0).toString()],
      ['Productos con Stock Bajo', (report.stockAlerts?.lowStock || 0).toString()],
      ['Productos Sin Stock', (report.stockAlerts?.outOfStock || 0).toString()],
      ['Productos Críticos', (report.stockAlerts?.critical || 0).toString()],
      ['Productos por Vencer', (report.stockAlerts?.expiringSoon || 0).toString()],
      [''],
      ['Inventario por Tienda'],
      ['Tienda', 'Cantidad de Productos', 'Stock Total', 'Valor del Stock'],
      ...(report.inventoryByStore || []).map(store => [
        store.storeName || 'N/A',
        (store.productCount || 0).toString(),
        (store.totalStock || 0).toString(),
        (store.totalValue || 0).toString()
      ]),
      [''],
      ['Inventario por Categoría'],
      ['Categoría', 'Cantidad de Productos', 'Stock Total', 'Valor del Stock'],
      ...(report.inventoryByCategory || []).map(category => [
        category.categoryName || 'N/A',
        (category.productCount || 0).toString(),
        (category.totalStock || 0).toString(),
        (category.totalValue || 0).toString()
      ]),
      [''],
      ['Productos con Stock Bajo'],
      ['Producto', 'Código', 'Tienda', 'Stock Actual', 'Stock Mínimo', 'Nivel de Alerta'],
      ...(report.lowStockProducts || []).map(product => [
        product.productName || 'N/A',
        product.productCode || 'N/A',
        product.storeName || 'N/A',
        (product.currentStock || 0).toString(),
        (product.minStockLevel || 0).toString(),
        product.alertLevel || 'N/A'
      ]),
      [''],
      ['Lotes por Vencer'],
      ['Código Lote', 'Producto', 'Tienda', 'Fecha Vencimiento', 'Días Restantes', 'Cantidad'],
      ...(report.expiringBatches || []).map(batch => [
        batch.batchCode || 'N/A',
        batch.productName || 'N/A',
        batch.storeName || 'N/A',
        batch.expirationDate || 'N/A',
        (batch.daysUntilExpiration || 0).toString(),
        (batch.currentQuantity || 0).toString()
      ])
    ];

    return data;
  }
}

export const reportsService = new ReportsService();