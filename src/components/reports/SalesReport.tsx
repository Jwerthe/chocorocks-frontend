// src/components/reports/SalesReport.tsx
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
import { formatters } from '@/utils/formatters';
import { SalesReportData, ReportProps, ReportFilters } from '@/types/reports';
import { SaleResponse, SaleDetailResponse, ProductResponse, StoreResponse } from '@/types';
import { saleAPI, saleDetailAPI, productAPI, storeAPI } from '@/services/api';

interface SalesReportState {
  data: SalesReportData | null;
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
}

export const SalesReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<SalesReportState>({
    data: null,
    loading: false,
    error: null,
    filters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días atrás
      endDate: new Date().toISOString().split('T')[0], // Hoy
    }
  });

  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      try {
        const [storesData, productsData] = await Promise.all([
          storeAPI.getAllStores(),
          productAPI.getAllProducts()
        ]);
        setStores(storesData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Obtener todas las ventas y detalles
      const [sales, saleDetails] = await Promise.all([
        saleAPI.getAllSales(),
        saleDetailAPI.getAllSaleDetails()
      ]);

      // Filtrar ventas por fecha
      const filteredSales = sales.filter((sale: SaleResponse) => {
        if (!sale.createdAt) return false; // o asigna fallback:
const saleDate = sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : '';

        const startDate = state.filters.startDate;
        const endDate = state.filters.endDate;
        
        return (!startDate || saleDate >= startDate) && 
               (!endDate || saleDate <= endDate) &&
               (!state.filters.storeId || sale.store.id === state.filters.storeId);
      });

      // Procesar datos para el reporte
      const totalSales = filteredSales.length;
      const totalRevenue = filteredSales.reduce((sum: number, sale: SaleResponse) => sum + sale.totalAmount, 0);
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Ventas por tienda
      const salesByStore = stores.map((store: StoreResponse) => {
        const storeSales = filteredSales.filter((sale: SaleResponse) => sale.store.id === store.id);
        return {
          storeName: store.name,
          salesCount: storeSales.length,
          revenue: storeSales.reduce((sum: number, sale: SaleResponse) => sum + sale.totalAmount, 0)
        };
      }).filter(item => item.salesCount > 0);

      // Ventas por producto
      const productSalesMap = new Map<number, { name: string; quantity: number; revenue: number }>();
      
      saleDetails.forEach((detail: SaleDetailResponse) => {
        const saleInPeriod = filteredSales.find((sale: SaleResponse) => sale.id === detail.sale.id);
        if (saleInPeriod) {
          const productId = detail.product.id;
          const existing = productSalesMap.get(productId) || { 
            name: detail.product.nameProduct, 
            quantity: 0, 
            revenue: 0 
          };
          existing.quantity += detail.quantity;
          existing.revenue += detail.subtotal;
          productSalesMap.set(productId, existing);
        }
      });

      const salesByProduct = Array.from(productSalesMap.values())
        .map(item => ({
          productName: item.name,
          quantitySold: item.quantity,
          revenue: item.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10

      // Ventas diarias
      const dailySalesMap = new Map<string, { sales: number; revenue: number }>();
      filteredSales.forEach((sale: SaleResponse) => {
        const date = new Date(sale.createdAt).toISOString().split('T')[0];
        const existing = dailySalesMap.get(date) || { sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += sale.totalAmount;
        dailySalesMap.set(date, existing);
      });

      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const reportData: SalesReportData = {
        period: `${state.filters.startDate} - ${state.filters.endDate}`,
        totalSales,
        totalRevenue,
        averageTicket,
        salesByStore,
        salesByProduct,
        dailySales
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
  }, [state.filters, stores]);

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
      'Reporte de Ventas',
      `Período: ${state.data.period}`,
      '',
      'Resumen General',
      `Total Ventas,${state.data.totalSales}`,
      `Total Ingresos,${formatters.currency(state.data.totalRevenue)}`,
      `Ticket Promedio,${formatters.currency(state.data.averageTicket)}`,
      '',
      'Ventas por Tienda',
      'Tienda,Cantidad Ventas,Ingresos',
      ...state.data.salesByStore.map(item => 
        `${item.storeName},${item.salesCount},${item.revenue}`
      ),
      '',
      'Productos Más Vendidos',
      'Producto,Cantidad,Ingresos',
      ...state.data.salesByProduct.map(item => 
        `${item.productName},${item.quantitySold},${item.revenue}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-ventas-${Date.now()}.csv`;
    link.click();
  };

  const summaryCards = state.data ? [
    {
      title: 'Total Ventas',
      value: state.data.totalSales.toString(),
      icon: '📊'
    },
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue),
      icon: '💰'
    },
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.averageTicket),
      icon: '🎯'
    },
    {
      title: 'Tiendas Activas',
      value: state.data.salesByStore.length.toString(),
      icon: '🏪'
    }
  ] : [];

  const storeColumns = [
    { key: 'storeName', header: 'Tienda' },
    { key: 'salesCount', header: 'Ventas' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    }
  ];

  const productColumns = [
    { key: 'productName', header: 'Producto' },
    { key: 'quantitySold', header: 'Cantidad Vendida' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
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
        </div>
      )
    },
    {
      id: 'stores',
      label: 'Por Tienda',
      content: (
        <Table
          data={state.data?.salesByStore || []}
          columns={storeColumns}
          emptyMessage="No hay datos de ventas por tienda"
        />
      )
    },
    {
      id: 'products',
      label: 'Por Producto',
      content: (
        <Table
          data={state.data?.salesByProduct || []}
          columns={productColumns}
          emptyMessage="No hay datos de productos vendidos"
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
          <div className="flex items-end gap-2">
            <Button onClick={generateReport} isLoading={state.loading}>
              Generar Reporte
            </Button>
            {state.data && (
              <Button variant="outline" onClick={handleExport}>
                Exportar CSV
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <Alert variant="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title={`Reporte de Ventas - ${state.data.period}`}>
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