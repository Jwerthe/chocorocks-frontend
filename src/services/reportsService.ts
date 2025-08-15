// src/services/reportsService.ts - VERSIÓN CORREGIDA Y SIMPLIFICADA
import { 
  SalesReportResponse,
  InventoryReportResponse,
  ProfitabilityReportResponse,
  BestSellingProductsReportResponse,
  TraceabilityReportResponse,
  ExecutiveDashboardResponse
} from '@/types';
import { ReportFilters } from '@/types/reports';
import { reportsAPI } from '@/services/api';

class ReportsService {
  // ✅ Sales Report - Simplificado para usar datos del backend tal como vienen
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

      // ✅ Devolver los datos tal como vienen del backend
      return report;
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Error al generar el reporte de ventas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Inventory Report - Simplificado
  async generateInventoryReport(storeId?: number, categoryId?: number): Promise<InventoryReportResponse> {
    const storeIds = storeId ? [storeId] : undefined;
    const categoryIds = categoryId ? [categoryId] : undefined;
    
    try {
      const report = await reportsAPI.getInventoryReport(storeIds, categoryIds);
      
      // ✅ Devolver los datos tal como vienen del backend
      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw new Error('Error al generar el reporte de inventario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Profitability Report - Simplificado
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

      // ✅ Devolver los datos tal como vienen del backend
      return report;
    } catch (error) {
      console.error('Error generating profitability report:', error);
      throw new Error('Error al generar el reporte de rentabilidad: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Top Products Report - Simplificado
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

      // ✅ Devolver los datos tal como vienen del backend
      return report;
    } catch (error) {
      console.error('Error generating top products report:', error);
      throw new Error('Error al generar el reporte de productos más vendidos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Traceability Report - Simplificado
  async generateTraceabilityReport(batchCode: string): Promise<TraceabilityReportResponse> {
    if (!batchCode || batchCode.trim() === '') {
      throw new Error('Código de lote es requerido');
    }

    try {
      const report = await reportsAPI.getTraceabilityReportByBatch(batchCode.trim());
      
      // ✅ Devolver los datos tal como vienen del backend
      return report;
    } catch (error) {
      console.error('Error generating traceability report:', error);
      throw new Error('Error al generar el reporte de trazabilidad: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Traceability by Product - Simplificado
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
      
      // ✅ Devolver los datos tal como vienen del backend
      return reports;
    } catch (error) {
      console.error('Error generating traceability report by product:', error);
      throw new Error('Error al generar el reporte de trazabilidad por producto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Executive Dashboard - Simplificado
  async generateExecutiveDashboard(
    startDate: string,
    endDate: string
  ): Promise<ExecutiveDashboardResponse> {
    if (!startDate || !endDate) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }

    try {
      const dashboard = await reportsAPI.getExecutiveDashboard(startDate, endDate);
      
      // ✅ Devolver los datos tal como vienen del backend
      return dashboard;
    } catch (error) {
      console.error('Error generating executive dashboard:', error);
      throw new Error('Error al generar el dashboard ejecutivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Sales Summary - Simplificado
  async getSalesSummary(days: number = 30): Promise<any> {
    try {
      return await reportsAPI.getSalesSummary(days);
    } catch (error) {
      console.error('Error getting sales summary:', error);
      throw new Error('Error al obtener el resumen de ventas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  // ✅ Get Available Periods
  async getAvailablePeriods(): Promise<string[]> {
    try {
      return await reportsAPI.getAvailablePeriods();
    } catch (error) {
      console.error('Error getting available periods:', error);
      return [];
    }
  }

  // ✅ Get Report Filters
  async getReportFilters(): Promise<Record<string, any>> {
    try {
      return await reportsAPI.getReportFilters();
    } catch (error) {
      console.error('Error getting report filters:', error);
      return {};
    }
  }

  // ✅ Validate Date Range
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

  // ✅ Format Filters for API
  formatFiltersForAPI(filters: ReportFilters): Record<string, any> {
    const apiFilters: Record<string, any> = {};
    
    if (filters.startDate) apiFilters.startDate = filters.startDate;
    if (filters.endDate) apiFilters.endDate = filters.endDate;
    if (filters.storeId) apiFilters.storeIds = [filters.storeId];
    if (filters.categoryId) apiFilters.categoryIds = [filters.categoryId];
    if (filters.productId) apiFilters.productId = filters.productId;
    
    return apiFilters;
  }

  // ✅ Export to CSV (mantener función útil)
  exportToCSV(data: any[][], filename: string): void {
    const csvContent = data.map(row => 
      row.map(cell => {
        let cellValue = '';
        if (cell === null || cell === undefined) {
          cellValue = '';
        } else if (typeof cell === 'object') {
          cellValue = JSON.stringify(cell);
        } else {
          cellValue = String(cell);
        }
        
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

  // ✅ Format Sales Report for CSV - Simplificado
  formatSalesReportForCSV(report: SalesReportResponse): string[][] {
    const data = [
      ['Reporte de Ventas', report.period || 'N/A'],
      [''],
      ['Métricas Generales'],
      ['Total de Ventas', (report.totalSales || 0).toString()],
      ['Ingresos Totales', (report.totalRevenue || 0).toString()],
      ['Ticket Promedio', (report.averageTicket || 0).toString()],
      [''],
      ['Ventas por Tienda'],
      ['Tienda', 'Cantidad de Ventas', 'Ingresos'],
      ...(report.salesByStore || []).map((store: any) => [
        store.storeName || 'N/A',
        (store.salesCount || 0).toString(),
        (store.revenue || 0).toString()
      ])
    ];

    return data;
  }

  // ✅ Format Inventory Report for CSV - Simplificado
  formatInventoryReportForCSV(report: InventoryReportResponse): string[][] {
    const data = [
      ['Reporte de Inventario'],
      [''],
      ['Métricas Generales'],
      ['Total de Productos', (report.totalProducts || 0).toString()],
      ['Productos con Stock Bajo', (report.lowStockProducts || 0).toString()],
      ['Productos Vencidos', (report.expiredProducts || 0).toString()],
      [''],
      ['Inventario por Tienda'],
      ['Tienda', 'Cantidad de Productos', 'Stock Total'],
      ...(report.inventoryByStore || []).map((store: any) => [
        store.storeName || 'N/A',
        (store.productsCount || 0).toString(),
        (store.totalStock || 0).toString()
      ])
    ];

    return data;
  }
}

export const reportsService = new ReportsService();