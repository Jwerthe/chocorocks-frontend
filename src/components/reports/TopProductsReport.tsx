// src/components/reports/TopProductsReport.tsx (ACTUALIZADO - USAR REPORTS API)
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
import { BestSellingProductsReportResponse, StoreResponse, CategoryResponse } from '@/types';
import { storeAPI, categoryAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface TopProductsReportState {
  data: BestSellingProductsReportResponse | null;
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
  topCount: number;
}

export const TopProductsReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<TopProductsReportState>({
    data: null,
    loading: false,
    error: null,
    filters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    topCount: 20
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
      const report = await reportsService.generateTopProductsReport(state.filters, state.topCount);
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
  }, [state.filters, state.topCount]);

  const handleFilterChange = (key: keyof ReportFilters, value: string): void => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value || undefined
      }
    }));
  };

  const handleTopCountChange = (value: string): void => {
    setState(prev => ({
      ...prev,
      topCount: parseInt(value) || 20
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    const csvContent = [
      'Reporte de Productos Más Vendidos',
      `Período: ${state.data.period}`,
      '',
      'Top Productos',
      'Ranking,Producto,Código,Categoría,Cantidad Vendida,Ingresos,Ventas,Precio Promedio,Participación',
      ...state.data.products.map(item => 
        `${item.rank},${item.productName},${item.productCode},${item.categoryName},${item.quantitySold},${item.revenue},${item.salesCount},${item.averagePrice},${item.marketShare}%`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-productos-mas-vendidos-${Date.now()}.csv`;
    link.click();
  };

  const getRankBadgeVariant = (rank: number): 'primary' | 'success' | 'warning' => {
    if (rank <= 3) return 'success';
    if (rank <= 10) return 'primary';
    return 'warning';
  };

  const topProductsColumns = [
    { 
      key: 'rank', 
      header: 'Ranking',
      render: (value: number) => (
        <Badge variant={getRankBadgeVariant(value)}>
          #{value}
        </Badge>
      )
    },
    { key: 'productName', header: 'Producto' },
    { key: 'productCode', header: 'Código' },
    { key: 'categoryName', header: 'Categoría' },
    { 
      key: 'quantitySold', 
      header: 'Cantidad Vendida',
      render: (value: number) => formatters.number(value)
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { key: 'salesCount', header: 'Ventas' },
    { 
      key: 'averagePrice', 
      header: 'Precio Promedio',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'marketShare', 
      header: 'Participación',
      render: (value: number) => formatters.percentage(value)
    }
  ];

  // Crear datos para análisis por categoría
  const categoryPerformance = state.data ? 
    state.data.products.reduce((acc, product) => {
      const category = acc.find(c => c.categoryName === product.categoryName);
      if (category) {
        category.totalQuantitySold += product.quantitySold;
        category.totalRevenue += product.revenue;
        category.productsCount += 1;
      } else {
        acc.push({
          categoryName: product.categoryName,
          totalQuantitySold: product.quantitySold,
          totalRevenue: product.revenue,
          productsCount: 1
        });
      }
      return acc;
    }, [] as Array<{
      categoryName: string;
      totalQuantitySold: number;
      totalRevenue: number;
      productsCount: number;
    }>).sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
    : [];

  const categoryColumns = [
    { key: 'categoryName', header: 'Categoría' },
    { 
      key: 'totalQuantitySold', 
      header: 'Cantidad Total',
      render: (value: number) => formatters.number(value)
    },
    { 
      key: 'totalRevenue', 
      header: 'Ingresos Totales',
      render: (value: number) => formatters.currency(value)
    },
    { key: 'productsCount', header: 'Productos' }
  ];

  const topProductsContent = state.data ? (
    <div className="space-y-6">
      {/* Top 5 productos destacados */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {state.data.products.slice(0, 5).map((product, index) => (
          <Card key={product.rank} className="text-center">
            <div className="text-2xl mb-2">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'}
            </div>
            <Badge variant={getRankBadgeVariant(product.rank)} className="mb-2">
              #{product.rank}
            </Badge>
            <h4 className="font-bold text-sm mb-1">{product.productName}</h4>
            <p className="text-xs text-gray-600 mb-2">{product.categoryName}</p>
            <div className="text-lg font-bold text-[#7ca1eb]">
              {formatters.number(product.quantitySold)}
            </div>
            <div className="text-xs text-gray-500">unidades</div>
            <div className="text-sm font-medium mt-1">
              {formatters.currency(product.revenue)}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabla completa */}
      <Table
        data={state.data.products}
        columns={topProductsColumns}
        emptyMessage="No hay datos de productos vendidos"
      />
    </div>
  ) : null;

  const categoryContent = categoryPerformance.length > 0 ? (
    <div className="space-y-6">
      {/* Gráfico de barras simple con progress bars */}
      <Card title="Rendimiento Visual por Categoría">
        <div className="space-y-4">
          {categoryPerformance.slice(0, 10).map((category, index) => {
            const maxQuantity = Math.max(...categoryPerformance.map(c => c.totalQuantitySold));
            const percentage = (category.totalQuantitySold / maxQuantity) * 100;
            
            return (
              <div key={category.categoryName} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{category.categoryName}</span>
                  <div className="text-sm text-gray-600">
                    {formatters.number(category.totalQuantitySold)} unidades
                  </div>
                </div>
                <ProgressBar 
                  value={percentage} 
                  max={100} 
                  variant={index < 3 ? 'success' : 'primary'}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tabla de categorías */}
      <Table
        data={categoryPerformance}
        columns={categoryColumns}
        emptyMessage="No hay datos de categorías"
      />
    </div>
  ) : null;

  const tabsData = [
    {
      id: 'products',
      label: 'Top Productos',
      content: topProductsContent
    },
    {
      id: 'categories',
      label: 'Por Categoría',
      content: categoryContent
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card title="Filtros del Reporte">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <Select
            label="Top Productos"
            value={state.topCount.toString()}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleTopCountChange(e.target.value)
            }
            options={[
              { value: '10', label: 'Top 10' },
              { value: '20', label: 'Top 20' },
              { value: '50', label: 'Top 50' },
              { value: '100', label: 'Top 100' }
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

      {/* Información del reporte */}
      {state.data && (
        <Alert variant="info">
          <div className="text-center">
            <strong>Reporte Generado:</strong> {state.data.period} | 
            Top {state.data.products.length} productos más vendidos | 
            Total productos vendidos: {formatters.number(state.data.totalProductsSold)}
          </div>
        </Alert>
      )}

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title={`Top ${state.topCount} Productos Más Vendidos`}>
          <Tabs tabs={tabsData} defaultActiveTab="products" />
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