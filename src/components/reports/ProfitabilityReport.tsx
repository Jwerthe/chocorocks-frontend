// src/components/reports/ProfitabilityReport.tsx (ACTUALIZADO - USAR REPORTS API)
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
import { ProfitabilityReportResponse, StoreResponse, CategoryResponse } from '@/types';
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
        setStores(storesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // ✅ NUEVO: Usar endpoint directo de reports
  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await reportsService.generateProfitabilityReport(state.filters);
      setState(prev => ({ 
        ...prev, 
        data: report, 
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
      `Ingresos Totales,${formatters.currency(state.data.totalRevenue)}`,
      `Costos Totales,${formatters.currency(state.data.totalCosts)}`,
      `Utilidad Bruta,${formatters.currency(state.data.grossProfit)}`,
      `Margen de Utilidad,${formatters.percentage(state.data.profitMargin)}`,
      '',
      'Rentabilidad por Producto',
      'Producto,Ingresos,Costos,Utilidad,Margen,Unidades Vendidas',
      ...state.data.profitabilityByProduct.map(item => 
        `${item.productName},${item.revenue},${item.costs},${item.profit},${item.margin}%,${item.unitsSold}`
      ),
      '',
      'Rentabilidad por Tienda',
      'Tienda,Ingresos,Costos,Utilidad,Margen',
      ...state.data.profitabilityByStore.map(item => 
        `${item.storeName},${item.revenue},${item.costs},${item.profit},${item.margin}%`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-rentabilidad-${Date.now()}.csv`;
    link.click();
  };

  const getMarginVariant = (margin: number): 'success' | 'warning' | 'danger' => {
    if (margin >= 30) return 'success';
    if (margin >= 15) return 'warning';
    return 'danger';
  };

  const summaryCards = state.data ? [
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue),
      icon: '💰',
      variant: 'primary' as const
    },
    {
      title: 'Costos Totales',
      value: formatters.currency(state.data.totalCosts),
      icon: '📊',
      variant: 'secondary' as const
    },
    {
      title: 'Utilidad Bruta',
      value: formatters.currency(state.data.grossProfit),
      icon: '📈',
      variant: state.data.grossProfit >= 0 ? 'success' as const : 'danger' as const
    },
    {
      title: 'Margen de Utilidad',
      value: formatters.percentage(state.data.profitMargin),
      icon: '🎯',
      variant: getMarginVariant(state.data.profitMargin)
    }
  ] : [];

  const productColumns = [
    { key: 'productName', header: 'Producto' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'costs', 
      header: 'Costos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatters.currency(value)}
        </span>
      )
    },
    { 
      key: 'margin', 
      header: 'Margen',
      render: (value: number) => (
        <Badge variant={getMarginVariant(value)}>
          {formatters.percentage(value)}
        </Badge>
      )
    },
    { key: 'unitsSold', header: 'Unidades' }
  ];

  const storeColumns = [
    { key: 'storeName', header: 'Tienda' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'costs', 
      header: 'Costos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatters.currency(value)}
        </span>
      )
    },
    { 
      key: 'margin', 
      header: 'Margen',
      render: (value: number) => (
        <Badge variant={getMarginVariant(value)}>
          {formatters.percentage(value)}
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
          
          {state.data && (
            <Card title="Distribución de Costos vs Ingresos">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Ingresos</span>
                    <span>{formatters.currency(state.data.totalRevenue)}</span>
                  </div>
                  <ProgressBar 
                    value={state.data.totalRevenue} 
                    max={state.data.totalRevenue} 
                    variant="success"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Costos</span>
                    <span>{formatters.currency(state.data.totalCosts)}</span>
                  </div>
                  <ProgressBar 
                    value={state.data.totalCosts} 
                    max={state.data.totalRevenue} 
                    variant="danger"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Utilidad Bruta</span>
                    <span className={state.data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatters.currency(state.data.grossProfit)}
                    </span>
                  </div>
                  <ProgressBar 
                    value={Math.abs(state.data.grossProfit)} 
                    max={state.data.totalRevenue} 
                    variant={state.data.grossProfit >= 0 ? 'success' : 'danger'}
                  />
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
          data={state.data?.profitabilityByProduct || []}
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
          data={state.data?.profitabilityByStore || []}
          columns={storeColumns}
          emptyMessage="No hay datos de rentabilidad por tienda"
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
      {state.data && state.data.profitMargin < 15 && (
        <Alert variant="warning">
          <strong>Margen de Utilidad Bajo:</strong> El margen de utilidad actual es {formatters.percentage(state.data.profitMargin)}, 
          lo cual está por debajo del 15% recomendado.
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
          <p className="text-gray-500">Selecciona los filtros y haz clic en "Generar Reporte" para comenzar.</p>
        </div>
      )}
    </div>
  );
};