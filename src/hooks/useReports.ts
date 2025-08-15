// src/hooks/useReports.ts (ACTUALIZADO)
import { useState, useCallback, useEffect } from 'react';
import { ReportFilters } from '@/types/reports';
import { 
  SalesReportResponse,
  InventoryReportResponse,
  ProfitabilityReportResponse,
  BestSellingProductsReportResponse,
  TraceabilityReportResponse,
  ExecutiveDashboardResponse
} from '@/types/reports';
import { reportsService } from '@/services/reportsService';
import { formatters } from '@/utils/formatters';

interface UseReportsOptions {
  initialFilters?: Partial<ReportFilters>;
}

interface UseReportsReturn {
  filters: ReportFilters;
  loading: boolean;
  error: string | null;
  
  // Data states
  salesReport: SalesReportResponse | null;
  inventoryReport: InventoryReportResponse | null;
  profitabilityReport: ProfitabilityReportResponse | null;
  bestSellingReport: BestSellingProductsReportResponse | null;
  traceabilityReport: TraceabilityReportResponse | null;
  executiveDashboard: ExecutiveDashboardResponse | null;
  
  // ✅ NUEVAS FUNCIONES USANDO LA API DE REPORTS
  generateSalesReport: () => Promise<void>;
  generateInventoryReport: (storeId?: number, categoryId?: number) => Promise<void>;
  generateProfitabilityReport: () => Promise<void>;
  generateBestSellingReport: (limit?: number) => Promise<void>;
  generateTraceabilityReport: (batchCode: string) => Promise<void>;
  generateExecutiveDashboard: () => Promise<void>;
  getSalesSummary: (days?: number) => Promise<any>;
  
  // Utility functions
  updateFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetFilters: () => void;
  exportToCSV: (data: string[][], filename: string) => void;
  getDateRange: () => { startDate: string; endDate: string };
  
  // ✅ NUEVAS FUNCIONES DE EXPORTACIÓN
  exportSalesReport: () => void;
  exportInventoryReport: () => void;
  clearAllReports: () => void;
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const defaultFilters: ReportFilters = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ...options.initialFilters
  };

  // States
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NUEVOS ESTADOS PARA CADA TIPO DE REPORTE
  const [salesReport, setSalesReport] = useState<SalesReportResponse | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReportResponse | null>(null);
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReportResponse | null>(null);
  const [bestSellingReport, setBestSellingReport] = useState<BestSellingProductsReportResponse | null>(null);
  const [traceabilityReport, setTraceabilityReport] = useState<TraceabilityReportResponse | null>(null);
  const [executiveDashboard, setExecutiveDashboard] = useState<ExecutiveDashboardResponse | null>(null);

  // ✅ NUEVA FUNCIÓN: Generar reporte de ventas
  const generateSalesReport = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const report = await reportsService.generateSalesReport(filters);
      setSalesReport(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar reporte de ventas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ NUEVA FUNCIÓN: Generar reporte de inventario
  const generateInventoryReport = useCallback(async (storeId?: number, categoryId?: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const report = await reportsService.generateInventoryReport(storeId, categoryId);
      setInventoryReport(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar reporte de inventario';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NUEVA FUNCIÓN: Generar reporte de rentabilidad
  const generateProfitabilityReport = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const report = await reportsService.generateProfitabilityReport(filters);
      setProfitabilityReport(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar reporte de rentabilidad';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ NUEVA FUNCIÓN: Generar reporte de productos más vendidos
  const generateBestSellingReport = useCallback(async (limit: number = 20): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const report = await reportsService.generateTopProductsReport(filters, limit);
      setBestSellingReport(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar reporte de productos más vendidos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ NUEVA FUNCIÓN: Generar reporte de trazabilidad
  const generateTraceabilityReport = useCallback(async (batchCode: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const report = await reportsService.generateTraceabilityReport(batchCode);
      setTraceabilityReport(report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar reporte de trazabilidad';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NUEVA FUNCIÓN: Generar dashboard ejecutivo
  const generateExecutiveDashboard = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Fechas de inicio y fin son requeridas');
      }
      
      const dashboard = await reportsService.generateExecutiveDashboard(filters.startDate, filters.endDate);
      setExecutiveDashboard(dashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar dashboard ejecutivo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate]);

  // ✅ NUEVA FUNCIÓN: Obtener resumen de ventas
  const getSalesSummary = useCallback(async (days: number = 30): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      return await reportsService.getSalesSummary(days);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener resumen de ventas';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility functions (mantener las existentes)
  const updateFilter = useCallback(<K extends keyof ReportFilters>(
    key: K, 
    value: ReportFilters[K]
  ): void => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const resetFilters = useCallback((): void => {
    setFilters(defaultFilters);
  }, []);

  const exportToCSV = useCallback((data: string[][], filename: string): void => {
    reportsService.exportToCSV(data, filename);
  }, []);

  // ✅ NUEVA FUNCIÓN: Exportar reporte de ventas
  const exportSalesReport = useCallback((): void => {
    if (!salesReport) {
      setError('No hay datos de ventas para exportar');
      return;
    }
    
    const csvData = reportsService.formatSalesReportForCSV(salesReport);
    exportToCSV(csvData, 'reporte-ventas');
  }, [salesReport, exportToCSV]);

  // ✅ NUEVA FUNCIÓN: Exportar reporte de inventario
  const exportInventoryReport = useCallback((): void => {
    if (!inventoryReport) {
      setError('No hay datos de inventario para exportar');
      return;
    }
    
    const csvData = reportsService.formatInventoryReportForCSV(inventoryReport);
    exportToCSV(csvData, 'reporte-inventario');
  }, [inventoryReport, exportToCSV]);

  // ✅ NUEVA FUNCIÓN: Limpiar todos los reportes
  const clearAllReports = useCallback((): void => {
    setSalesReport(null);
    setInventoryReport(null);
    setProfitabilityReport(null);
    setBestSellingReport(null);
    setTraceabilityReport(null);
    setExecutiveDashboard(null);
    setError(null);
  }, []);

  const getDateRange = useCallback((): { startDate: string; endDate: string } => {
    return {
      startDate: filters.startDate || defaultFilters.startDate!,
      endDate: filters.endDate || defaultFilters.endDate!
    };
  }, [filters.startDate, filters.endDate, defaultFilters.startDate, defaultFilters.endDate]);

  return {
    filters,
    loading,
    error,
    
    // Data states
    salesReport,
    inventoryReport,
    profitabilityReport,
    bestSellingReport,
    traceabilityReport,
    executiveDashboard,
    
    // Report generation functions
    generateSalesReport,
    generateInventoryReport,
    generateProfitabilityReport,
    generateBestSellingReport,
    generateTraceabilityReport,
    generateExecutiveDashboard,
    getSalesSummary,
    
    // Utility functions
    updateFilter,
    setLoading,
    setError,
    clearError,
    resetFilters,
    exportToCSV,
    getDateRange,
    
    // Export functions
    exportSalesReport,
    exportInventoryReport,
    clearAllReports
  };
}

// Hook específico para cálculos de reportes (mantener sin cambios)
interface UseReportCalculationsReturn {
  calculatePercentage: (value: number, total: number) => number;
  calculateGrowth: (current: number, previous: number) => number;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDate: (date: string | Date) => string;
  calculateAverage: (values: number[]) => number;
  calculateTotal: (values: number[]) => number;
  getVariantByValue: (value: number, thresholds: { good: number; warning: number }) => 'success' | 'warning' | 'danger';
}

export function useReportCalculations(): UseReportCalculationsReturn {
  const calculatePercentage = useCallback((value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
  }, []);

  const calculateGrowth = useCallback((current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, []);

  const calculateAverage = useCallback((values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, []);

  const calculateTotal = useCallback((values: number[]): number => {
    return values.reduce((sum, value) => sum + value, 0);
  }, []);

  const getVariantByValue = useCallback((
    value: number, 
    thresholds: { good: number; warning: number }
  ): 'success' | 'warning' | 'danger' => {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'danger';
  }, []);

  return {
    calculatePercentage,
    calculateGrowth,
    formatCurrency: formatters.currency,
    formatPercentage: formatters.percentage,
    formatNumber: formatters.number,
    formatDate: formatters.date,
    calculateAverage,
    calculateTotal,
    getVariantByValue
  };
}

// ✅ NUEVO: Hook para manejo específico de datos de reportes con cache
interface UseReportDataOptions<T> {
  fetchData: () => Promise<T>;
  dependencies?: React.DependencyList;
  cacheKey?: string;
}

interface UseReportDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearData: () => void;
}

export function useReportData<T>(options: UseReportDataOptions<T>): UseReportDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await options.fetchData();
      setData(result);
      
      // ✅ Cache básico si se proporciona una key
      if (options.cacheKey && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(options.cacheKey, JSON.stringify(result));
        } catch (e) {
          console.warn('No se pudo guardar en cache:', e);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [options.fetchData, options.cacheKey]);

  const clearData = useCallback((): void => {
    setData(null);
    setError(null);
    
    // Limpiar cache
    if (options.cacheKey && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(options.cacheKey);
      } catch (e) {
        console.warn('No se pudo limpiar cache:', e);
      }
    }
  }, [options.cacheKey]);

  // Intentar cargar desde cache al montar
  useEffect(() => {
    if (options.cacheKey && typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(options.cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('No se pudo cargar desde cache:', e);
      }
    }
  }, [options.cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearData
  };
}