// src/hooks/useReports.ts
import { useState, useCallback } from 'react';
import { ReportFilters } from '@/types/reports';
import { formatters } from '@/utils/formatters';

interface UseReportsOptions {
  initialFilters?: Partial<ReportFilters>;
}

interface UseReportsReturn {
  filters: ReportFilters;
  loading: boolean;
  error: string | null;
  updateFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetFilters: () => void;
  exportToCSV: (data: string[][], filename: string) => void;
  getDateRange: () => { startDate: string; endDate: string };
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const defaultFilters: ReportFilters = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ...options.initialFilters
  };

  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    link.download = `${filename}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
    updateFilter,
    setLoading,
    setError,
    clearError,
    resetFilters,
    exportToCSV,
    getDateRange
  };
}

// Hook específico para cálculos de reportes
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

// Hook para manejo de datos de reportes
interface UseReportDataOptions<T> {
  fetchData: () => Promise<T>;
  dependencies?: React.DependencyList;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [options.fetchData]);

  const clearData = useCallback((): void => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearData
  };
}