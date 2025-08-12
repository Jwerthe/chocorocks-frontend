// src/components/reports/InventoryReport.tsx (ACTUALIZADO - USAR REPORTS API)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatters } from '@/utils/formatters';
import { ReportProps } from '@/types/reports';
import { InventoryReportResponse, StoreResponse, CategoryResponse } from '@/types';
import { storeAPI, categoryAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface InventoryReportState {
  data: InventoryReportResponse | null;
  loading: boolean;
  error: string | null;
  selectedStoreId: number | null;
  selectedCategoryId: number | null;
}

export const InventoryReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<InventoryReportState>({
    data: null,
    loading: false,
    error: null,
    selectedStoreId: null,
    selectedCategoryId: null
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
      const report = await reportsService.generateInventoryReport(
        state.selectedStoreId || undefined,
        state.selectedCategoryId || undefined
      );
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
  }, [state.selectedStoreId, state.selectedCategoryId]);

  const handleStoreChange = (storeId: string): void => {
    setState(prev => ({
      ...prev,
      selectedStoreId: storeId ? parseInt(storeId) : null
    }));
  };

  const handleCategoryChange = (categoryId: string): void => {
    setState(prev => ({
      ...prev,
      selectedCategoryId: categoryId ? parseInt(categoryId) : null
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    // ✅ USAR: Helper del reportsService
    const csvData = reportsService.formatInventoryReportForCSV(state.data);
    reportsService.exportToCSV(csvData, 'reporte-inventario');
  };

  const summaryCards = state.data ? [
    {
      title: 'Total Productos',
      value: state.data.totalProducts.toString(),
      icon: '📦',
      variant: 'primary' as const
    },
    {
      title: 'Stock Bajo',
      value: state.data.lowStockProducts.toString(),
      icon: '⚠️',
      variant: 'warning' as const
    },
    {
      title: 'Vencidos',
      value: state.data.expiredProducts.toString(),
      icon: '❌',
      variant: 'danger' as const
    },
    {
      title: 'Valor Total',
      value: formatters.currency(state.data.totalStockValue),
      icon: '💎',
      variant: 'success' as const
    }
  ] : [];

  const storeColumns = [
    { 
      key: 'storeName', 
      header: 'Tienda',
      render: (value: string) => <span className='text-gray-800'>{value}</span>
    },
    { 
      key: 'productsCount', 
      header: 'Productos',
      render: (value: number) => <span className='text-gray-800'>{value}</span>
    },
    { 
      key: 'totalStock', 
      header: 'Stock Total',
      render: (value: number) => <span className='text-gray-800'>{value}</span>
    },
    { 
      key: 'stockValue', 
      header: 'Valor Stock',
      render: (value: number) => <span className='text-gray-800'>{formatters.currency(value)}</span>
    }
  ];

  const rotationColumns = [
    { 
      key: 'productName', 
      header: 'Producto', 
      render: (value: string) => <span className='text-gray-800'>{value}</span> 
    },
    { 
      key: 'currentStock', 
      header: 'Stock Actual',
      render: (value: number) => <span className='text-gray-800'>{value}</span> 
    },
    { 
      key: 'minStockLevel', 
      header: 'Stock Mínimo', 
      render: (value: number) => <span className='text-gray-800'>{value}</span> 
    },
    { 
      key: 'status', 
      header: 'Estado',
      render: (value: string) => <StatusBadge status={value} />
    },
    { 
      key: 'daysOfStock', 
      header: 'Días de Stock',
      render: (value: number) => <span className='text-gray-700'>{value} días</span>
    }
  ];

  const expiredColumns = [
    { key: 'batchCode', header: 'Código Lote' },
    { key: 'productName', header: 'Producto' },
    { 
      key: 'expirationDate', 
      header: 'Fecha Vencimiento',
      render: (value: string) => formatters.date(value)
    },
    { key: 'quantity', header: 'Cantidad' }
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
          data={state.data?.inventoryByStore || []}
          columns={storeColumns}
          emptyMessage="No hay datos de inventario por tienda"
        />
      )
    },
    {
      id: 'rotation',
      label: 'Rotación',
      content: (
        <Table
          data={state.data?.productRotation || []}
          columns={rotationColumns}
          emptyMessage="No hay datos de rotación de productos"
        />
      )
    },
    {
      id: 'expired',
      label: 'Vencidos',
      content: (
        <Table
          data={state.data?.expiredBatches || []}
          columns={expiredColumns}
          emptyMessage="No hay productos vencidos"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card title="Filtros del Reporte">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Tienda"
            value={state.selectedStoreId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleStoreChange(e.target.value)
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
            value={state.selectedCategoryId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleCategoryChange(e.target.value)
            }
            options={[
              { value: '', label: 'Todas las categorías' },
              ...categories.map((category: CategoryResponse) => ({
                value: category.id.toString(),
                label: category.name
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

      {/* Alertas importantes */}
      {state.data && (state.data.lowStockProducts > 0 || state.data.expiredProducts > 0) && (
        <Alert variant="warning">
          <div>
            <strong>Atención Requerida:</strong>
            {state.data.lowStockProducts > 0 && (
              <span> {state.data.lowStockProducts} productos con stock bajo.</span>
            )}
            {state.data.expiredProducts > 0 && (
              <span> {state.data.expiredProducts} productos vencidos.</span>
            )}
          </div>
        </Alert>
      )}

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title="Reporte de Inventario">
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