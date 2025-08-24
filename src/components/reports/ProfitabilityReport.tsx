// src/components/reports/ProfitabilityReport.tsx - CORREGIDO
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatters } from '@/utils/formatters';
import { ReportProps, ReportFilters } from '@/types/reports';
import { StoreResponse, CategoryResponse } from '@/types';
import { ProfitabilityReportResponse } from '@/types/reports';
import { storeAPI, categoryAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface ProfitabilityReportState {
  data: ProfitabilityReportResponse | null;
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
}

export const ProfitabilityReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<ProfitabilityReportState>({
    data: null,
    loading: false,
    error: null,
    filters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    }
  });

  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      try {
        const [storesData, categoriesData] = await Promise.all([
          storeAPI.getAllStores(),
          categoryAPI.getAllCategories()
        ]);
        setStores(storesData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Generar reporte usando endpoint directo de reports
  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await reportsService.generateProfitabilityReport(state.filters);
      setState(prev => ({ 
        ...prev, 
        data: report as any, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando reporte',
        loading: false 
      }));
    }
  }, [state.filters]);

  const handleFilterChange = (key: keyof ReportFilters, value: string): void => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value || undefined
      }
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    const csvContent = [
      'Reporte de Rentabilidad',
      `Período: ${state.filters.startDate} - ${state.filters.endDate}`,
      '',
      'Resumen General',
      `Ingresos Totales,${formatters.currency(state.data.totalRevenue || 0)}`,
      `Costos Totales,${formatters.currency(state.data.totalCosts || 0)}`,
      `Utilidad Bruta,${formatters.currency(state.data.grossProfit || 0)}`,
      `Margen de Utilidad,${formatters.percentage(state.data.profitMargin || 0)}`,
      '',
      'Rentabilidad por Producto',
      'Producto,Ingresos,Costos,Utilidad,Margen,Unidades Vendidas',
      ...(state.data.profitByProduct || []).map(item => 
        `${item.productName},${item.revenue || 0},${item.costs || 0},${item.profit || 0}`
      ),
      '',
      'Rentabilidad por Tienda',
      'Tienda,Ingresos,Costos,Utilidad,Margen',
      ...(state.data.profitByStore || []).map(item => 
        `${item.storeName},${item.revenue || 0},${item.costs || 0},${item.profit || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-rentabilidad-${Date.now()}.csv`;
    link.click();
  };

  const getMarginVariant = (margin: number | null | undefined): 'success' | 'warning' | 'danger' => {
    const validMargin = margin || 0;
    if (validMargin >= 30) return 'success';
    if (validMargin >= 15) return 'warning';
    return 'danger';
  };

  // ✅ CORREGIDO: Validación de datos y cálculos seguros
  const summaryCards = state.data ? [
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue || 0),
      icon: '💰',
      variant: 'primary' as const
    },
    {
      title: 'Costos Totales',
      value: formatters.currency(state.data.totalCosts || 0),
      icon: '📊',
      variant: 'secondary' as const
    },
    {
      title: 'Utilidad Bruta',
      value: formatters.currency(state.data.grossProfit || 0),
      icon: '📈',
      variant: (state.data.grossProfit || 0) >= 0 ? 'success' as const : 'danger' as const
    },
    {
      title: 'Margen de Utilidad',
      value: formatters.percentage(state.data.profitMargin || 0),
      icon: '🎯',
      variant: getMarginVariant(state.data.profitMargin)
    }
  ] : [];

  // ✅ CORREGIDO: Columnas con colores mejorados y validaciones
  const productColumns = [
    { 
      key: 'productName', 
      header: 'Producto',
      render: (value: string) => <span className="text-gray-700 font-medium">{value || 'N/A'}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'costs', 
      header: 'Costos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => {
        const profit = value || 0;
        return (
          <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatters.currency(profit)}
          </span>
        );
      }
    },
    { 
      key: 'margin', 
      header: 'Margen',
      render: (value: number) => (
        <Badge variant={getMarginVariant(value)}>
          {formatters.percentage(value || 0)}
        </Badge>
      )
    },
    { 
      key: 'unitsSold', 
      header: 'Unidades',
      render: (value: number) => <span className="text-gray-700">{formatters.number(value || 0)}</span>
    }
  ];

  const storeColumns = [
    { 
      key: 'storeName', 
      header: 'Tienda',
      render: (value: string) => <span className="text-gray-700 font-medium">{value || 'N/A'}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'costs', 
      header: 'Costos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => {
        const profit = value || 0;
        return (
          <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatters.currency(profit)}
          </span>
        );
      }
    },
    { 
      key: 'margin', 
      header: 'Margen',
      render: (value: number) => (
        <Badge variant={getMarginVariant(value)}>
          {formatters.percentage(value || 0)}
        </Badge>
      )
    }
  ];

  const categoryColumns = [
    { 
      key: 'categoryName', 
      header: 'Categoría',
      render: (value: string) => <span className="text-gray-700 font-medium">{value || 'N/A'}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'costs', 
      header: 'Costos',
      render: (value: number) => <span className="text-gray-700">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => {
        const profit = value || 0;
        return (
          <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatters.currency(profit)}
          </span>
        );
      }
    },
    { 
      key: 'profitMargin', 
      header: 'Margen',
      render: (value: number) => (
        <Badge variant={getMarginVariant(value)}>
          {formatters.percentage(value || 0)}
        </Badge>
      )
    }
  ];

  const tabsData = [
    {
      id: 'summary',
      label: 'Resumen',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => (
              <Card key={index} className="text-center">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-2xl font-bold text-[#7ca1eb]">{card.value}</div>
                <div className="text-sm text-gray-600">{card.title}</div>
              </Card>
            ))}
          </div>
          
          {/* ✅ MEJORADO: Distribución visual de costos vs ingresos */}
          {state.data && (
            <Card title="Distribución de Costos vs Ingresos">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Ingresos</span>
                    <span>{formatters.currency(state.data.totalRevenue || 0)}</span>
                  </div>
                  <ProgressBar 
                    value={state.data.totalRevenue || 0} 
                    max={state.data.totalRevenue || 1} 
                    variant="success"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Costos</span>
                    <span>{formatters.currency(state.data.totalCosts || 0)}</span>
                  </div>
                  <ProgressBar 
                    value={state.data.totalCosts || 0} 
                    max={state.data.totalRevenue || 1} 
                    variant="danger"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Utilidad Bruta</span>
                    <span className={(state.data.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatters.currency(state.data.grossProfit || 0)}
                    </span>
                  </div>
                  <ProgressBar 
                    value={Math.abs(state.data.grossProfit || 0)} 
                    max={Math.max(state.data.totalRevenue || 1, Math.abs(state.data.grossProfit || 0))} 
                    variant={(state.data.grossProfit || 0) >= 0 ? 'success' : 'danger'}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ✅ NUEVO: Análisis de rentabilidad */}
          {state.data && (
            <Card title="Análisis de Rentabilidad">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {formatters.percentage((state.data.totalRevenue || 0) > 0 ? ((state.data.totalCosts || 0) / (state.data.totalRevenue || 1)) * 100 : 0)}
                  </div>
                  <div className="text-sm text-gray-600">Proporción de Costos</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {formatters.percentage(state.data.profitMargin || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Margen de Utilidad</div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                  <div className="text-lg font-bold text-purple-600">
                    {formatters.number((state.data.profitByProduct || []).length)}
                  </div>
                  <div className="text-sm text-gray-600">Productos Analizados</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'products',
      label: 'Por Producto',
      content: (
        <Table
          data={state.data?.profitByProduct || []}
          columns={productColumns}
          emptyMessage="No hay datos de rentabilidad por producto"
        />
      )
    },
    {
      id: 'stores',
      label: 'Por Tienda',
      content: (
        <Table
          data={state.data?.profitByStore || []}
          columns={storeColumns}
          emptyMessage="No hay datos de rentabilidad por tienda"
        />
      )
    },
    {
      id: 'categories',
      label: 'Por Categoría',
      content: (
        <Table
          data={state.data?.profitByCategory || []}
          columns={categoryColumns}
          emptyMessage="No hay datos de rentabilidad por categoría"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card title="Filtros del Reporte">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            value={state.filters.startDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('startDate', e.target.value)
            }
          />
          <Input
            label="Fecha Fin"
            type="date"
            value={state.filters.endDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('endDate', e.target.value)
            }
          />
          <Select
            label="Tienda"
            value={state.filters.storeId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleFilterChange('storeId', e.target.value)
            }
            options={[
              { value: '', label: 'Todas las tiendas' },
              ...stores.map((store: StoreResponse) => ({
                value: store.id.toString(),
                label: store.name
              }))
            ]}
          />
          <Select
            label="Categoría"
            value={state.filters.categoryId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleFilterChange('categoryId', e.target.value)
            }
            options={[
              { value: '', label: 'Todas las categorías' },
              ...categories.map((category: CategoryResponse) => ({
                value: category.id.toString(),
                label: category.name
              }))
            ]}
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={generateReport} isLoading={state.loading}>
            Generar Reporte
          </Button>
          {state.data && (
            <Button variant="outline" onClick={handleExport}>
              Exportar CSV
            </Button>
          )}
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <Alert variant="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Alertas de rentabilidad */}
      {state.data && (state.data.profitMargin || 0) < 15 && (
        <Alert variant="warning">
          <div className="text-gray-700">
            <strong>Margen de Utilidad Bajo:</strong> El margen de utilidad actual es {formatters.percentage(state.data.profitMargin || 0)}, 
            lo cual está por debajo del 15% recomendado.
          </div>
        </Alert>
      )}

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title={`Reporte de Rentabilidad - ${state.filters.startDate} a ${state.filters.endDate}`}>
          <Tabs tabs={tabsData} defaultActiveTab="summary" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Reporte de Rentabilidad</h3>
          <p className="text-gray-500 mb-4">Selecciona los filtros y haz clic en "Generar Reporte" para comenzar.</p>
          <p className="text-sm text-gray-400">
            Este reporte incluye análisis de costos, utilidades y márgenes por producto, categoría y tienda.
          </p>
        </div>
      )}
    </div>
  );
};