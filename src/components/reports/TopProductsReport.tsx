// src/components/reports/TopProductsReport.tsx
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
import { TopProductsReportData, ReportProps, ReportFilters } from '@/types/reports';
import { SaleResponse, SaleDetailResponse, ProductResponse, StoreResponse, CategoryResponse } from '@/types';
import { saleAPI, saleDetailAPI, productAPI, storeAPI, categoryAPI } from '@/services/api';

interface TopProductsReportState {
  data: TopProductsReportData | null;
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
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      try {
        const [storesData, productsData, categoriesData] = await Promise.all([
          storeAPI.getAllStores(),
          productAPI.getAllProducts(),
          categoryAPI.getAllCategories()
        ]);
        setStores(storesData);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Obtener ventas y detalles
      const [sales, saleDetails] = await Promise.all([
        saleAPI.getAllSales(),
        saleDetailAPI.getAllSaleDetails()
      ]);

      // Filtrar ventas por período
      const filteredSales = sales.filter((sale: SaleResponse) => {
        if (!sale.createdAt) return false; // o asigna fallback:
const saleDate = sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : '';

        const startDate = state.filters.startDate;
        const endDate = state.filters.endDate;
        
        return (!startDate || saleDate >= startDate) && 
               (!endDate || saleDate <= endDate) &&
               (!state.filters.storeId || sale.store.id === state.filters.storeId);
      });

      const filteredSaleIds = new Set(filteredSales.map((sale: SaleResponse) => sale.id));

      // Filtrar detalles de venta correspondientes
      const filteredSaleDetails = saleDetails.filter((detail: SaleDetailResponse) => 
        filteredSaleIds.has(detail.sale.id) &&
        (!state.filters.categoryId || detail.product.category.id === state.filters.categoryId)
      );

      // Agrupar por producto
      const productSalesMap = new Map<number, {
        product: ProductResponse;
        totalQuantitySold: number;
        totalRevenue: number;
        salesCount: number;
        totalValue: number;
      }>();

      filteredSaleDetails.forEach((detail: SaleDetailResponse) => {
        const productId = detail.product.id;
        const existing = productSalesMap.get(productId) || {
          product: detail.product,
          totalQuantitySold: 0,
          totalRevenue: 0,
          salesCount: 0,
          totalValue: 0
        };

        existing.totalQuantitySold += detail.quantity;
        existing.totalRevenue += detail.subtotal;
        existing.salesCount += 1;
        existing.totalValue += detail.subtotal;

        productSalesMap.set(productId, existing);
      });

      // Convertir a array y ordenar por cantidad vendida
      const productSales = Array.from(productSalesMap.values())
        .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
        .slice(0, state.topCount);

      // Crear ranking de productos
      const topProducts = productSales.map((item, index) => ({
        productName: item.product.nameProduct,
        category: item.product.category.name,
        totalQuantitySold: item.totalQuantitySold,
        totalRevenue: item.totalRevenue,
        salesCount: item.salesCount,
        averagePrice: item.totalRevenue / Math.max(item.totalQuantitySold, 1),
        rank: index + 1
      }));

      // Rendimiento por categoría
      const categoryMap = new Map<number, {
        categoryName: string;
        totalQuantitySold: number;
        totalRevenue: number;
        productsCount: number;
      }>();

      productSales.forEach((item) => {
        const categoryId = item.product.category.id;
        const existing = categoryMap.get(categoryId) || {
          categoryName: item.product.category.name,
          totalQuantitySold: 0,
          totalRevenue: 0,
          productsCount: 0
        };

        existing.totalQuantitySold += item.totalQuantitySold;
        existing.totalRevenue += item.totalRevenue;
        existing.productsCount += 1;

        categoryMap.set(categoryId, existing);
      });

      const categoryPerformance = Array.from(categoryMap.values())
        .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

      const reportData: TopProductsReportData = {
        reportPeriod: `${state.filters.startDate} - ${state.filters.endDate}`,
        topProducts,
        categoryPerformance
      };

      setState(prev => ({ 
        ...prev, 
        data: reportData, 
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
      `Período: ${state.data.reportPeriod}`,
      '',
      'Top Productos',
      'Ranking,Producto,Categoría,Cantidad Vendida,Ingresos,Ventas,Precio Promedio',
      ...state.data.topProducts.map(item => 
        `${item.rank},${item.productName},${item.category},${item.totalQuantitySold},${item.totalRevenue},${item.salesCount},${item.averagePrice}`
      ),
      '',
      'Rendimiento por Categoría',
      'Categoría,Cantidad Total,Ingresos Totales,Productos',
      ...state.data.categoryPerformance.map(item => 
        `${item.categoryName},${item.totalQuantitySold},${item.totalRevenue},${item.productsCount}`
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
    { key: 'category', header: 'Categoría' },
    { 
      key: 'totalQuantitySold', 
      header: 'Cantidad Vendida',
      render: (value: number) => formatters.number(value)
    },
    { 
      key: 'totalRevenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { key: 'salesCount', header: 'Ventas' },
    { 
      key: 'averagePrice', 
      header: 'Precio Promedio',
      render: (value: number) => formatters.currency(value)
    }
  ];

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
        {state.data.topProducts.slice(0, 5).map((product, index) => (
          <Card key={product.rank} className="text-center">
            <div className="text-2xl mb-2">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'}
            </div>
            <Badge variant={getRankBadgeVariant(product.rank)} className="mb-2">
              #{product.rank}
            </Badge>
            <h4 className="font-bold text-sm mb-1">{product.productName}</h4>
            <p className="text-xs text-gray-600 mb-2">{product.category}</p>
            <div className="text-lg font-bold text-[#7ca1eb]">
              {formatters.number(product.totalQuantitySold)}
            </div>
            <div className="text-xs text-gray-500">unidades</div>
            <div className="text-sm font-medium mt-1">
              {formatters.currency(product.totalRevenue)}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabla completa */}
      <Table
        data={state.data.topProducts}
        columns={topProductsColumns}
        emptyMessage="No hay datos de productos vendidos"
      />
    </div>
  ) : null;

  const categoryContent = state.data ? (
    <div className="space-y-6">
      {/* Gráfico de barras simple con progress bars */}
      <Card title="Rendimiento Visual por Categoría">
        <div className="space-y-4">
          {state.data.categoryPerformance.slice(0, 10).map((category, index) => {
            const maxQuantity = Math.max(...state.data!.categoryPerformance.map(c => c.totalQuantitySold));
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
        data={state.data.categoryPerformance}
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
            <strong>Reporte Generado:</strong> {state.data.reportPeriod} | 
            Top {state.data.topProducts.length} productos más vendidos
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