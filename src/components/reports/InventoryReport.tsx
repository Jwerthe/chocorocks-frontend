// src/components/reports/InventoryReport.tsx - CORREGIDO
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
import { StoreResponse, CategoryResponse } from '@/types';
import { InventoryReportResponse } from '@/types/reports';
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

    const csvData = reportsService.formatInventoryReportForCSV(state.data);
    reportsService.exportToCSV(csvData, 'reporte-inventario');
  };

  // ✅ CORREGIDO: Validación de datos y alertas calculadas
  const alertsData = state.data?.stockAlerts || {
    lowStock: 0,
    outOfStock: 0,
    critical: 0,
    expiringSoon: 0
  };

  const summaryCards = state.data ? [
    {
      title: 'Total Productos',
      value: formatters.number(state.data.totalProducts || 0),
      icon: '📦',
      variant: 'primary' as const
    },
    {
      title: 'Stock Bajo',
      value: formatters.number(alertsData.lowStock || 0),
      icon: '⚠️',
      variant: 'warning' as const
    },
    {
      title: 'Sin Stock',
      value: formatters.number(alertsData.outOfStock || 0),
      icon: '❌',
      variant: 'danger' as const
    },
    {
      title: 'Valor Total',
      value: formatters.currency(state.data.totalValue || 0),
      icon: '💎',
      variant: 'success' as const
    }
  ] : [];

  // ✅ CORREGIDO: Columnas con colores mejorados
  const storeColumns = [
    { 
      key: 'storeName', 
      header: 'Tienda',
      render: (value: string) => <span className='text-gray-700 font-medium'>{value || 'N/A'}</span>
    },
    { 
      key: 'productCount', 
      header: 'Productos',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
    },
    { 
      key: 'totalStock', 
      header: 'Stock Total',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
    },
    { 
      key: 'totalValue', 
      header: 'Valor Stock',
      render: (value: number) => <span className='text-gray-700 font-medium'>{formatters.currency(value || 0)}</span>
    }
  ];

  const categoryColumns = [
    { 
      key: 'categoryName', 
      header: 'Categoría',
      render: (value: string) => <span className='text-gray-700 font-medium'>{value || 'N/A'}</span>
    },
    { 
      key: 'productCount', 
      header: 'Productos',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
    },
    { 
      key: 'totalStock', 
      header: 'Stock Total',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
    },
    { 
      key: 'totalValue', 
      header: 'Valor Stock',
      render: (value: number) => <span className='text-gray-700 font-medium'>{formatters.currency(value || 0)}</span>
    }
  ];

  const lowStockColumns = [
    { 
      key: 'productName', 
      header: 'Producto', 
      render: (value: string) => <span className='text-gray-700 font-medium'>{value || 'N/A'}</span> 
    },
    { 
      key: 'productCode', 
      header: 'Código', 
      render: (value: string) => <span className='text-gray-700'>{value || 'N/A'}</span> 
    },
    { 
      key: 'storeName', 
      header: 'Tienda', 
      render: (value: string) => <span className='text-gray-700'>{value || 'N/A'}</span> 
    },
    { 
      key: 'currentStock', 
      header: 'Stock Actual',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span> 
    },
    { 
      key: 'minStockLevel', 
      header: 'Stock Mínimo', 
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span> 
    },
    { 
      key: 'alertLevel', 
      header: 'Nivel',
      render: (value: string) => {
        const variants = {
          'LOW': 'warning' as const,
          'CRITICAL': 'danger' as const,
          'OUT_OF_STOCK': 'danger' as const
        };
        return (
          <Badge variant={variants[value as keyof typeof variants] || 'warning'}>
            {value === 'LOW' ? 'Bajo' : value === 'CRITICAL' ? 'Crítico' : value === 'OUT_OF_STOCK' ? 'Sin Stock' : value}
          </Badge>
        );
      }
    }
  ];

  const expiringBatchesColumns = [
    { 
      key: 'batchCode', 
      header: 'Código Lote',
      render: (value: string) => <span className='text-gray-700 font-medium'>{value || 'N/A'}</span>
    },
    { 
      key: 'productName', 
      header: 'Producto',
      render: (value: string) => <span className='text-gray-700'>{value || 'N/A'}</span>
    },
    { 
      key: 'storeName', 
      header: 'Tienda',
      render: (value: string) => <span className='text-gray-700'>{value || 'N/A'}</span>
    },
    { 
      key: 'expirationDate', 
      header: 'Fecha Vencimiento',
      render: (value: string) => <span className='text-gray-700'>{formatters.date(value)}</span>
    },
    { 
      key: 'daysUntilExpiration', 
      header: 'Días Restantes',
      render: (value: number) => {
        const days = value || 0;
        const color = days <= 7 ? 'text-red-600' : days <= 30 ? 'text-yellow-600' : 'text-gray-700';
        return <span className={color + ' font-medium'}>{days} días</span>;
      }
    },
    { 
      key: 'currentQuantity', 
      header: 'Cantidad',
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
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

          {/* ✅ NUEVO: Resumen de alertas visual */}
          <Card title="Estado General del Inventario">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-lg font-bold text-green-600">
                  {formatters.number((state.data?.totalProducts || 0) - (alertsData.lowStock || 0) - (alertsData.outOfStock || 0))}
                </div>
                <div className="text-xs text-gray-600">Stock Normal</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-lg font-bold text-yellow-600">
                  {formatters.number(alertsData.lowStock || 0)}
                </div>
                <div className="text-xs text-gray-600">Stock Bajo</div>
              </div>
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-lg font-bold text-red-600">
                  {formatters.number(alertsData.critical || 0)}
                </div>
                <div className="text-xs text-gray-600">Crítico</div>
              </div>
              <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="text-lg font-bold text-orange-600">
                  {formatters.number(alertsData.expiringSoon || 0)}
                </div>
                <div className="text-xs text-gray-600">Por Vencer</div>
              </div>
            </div>
          </Card>
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
      id: 'categories',
      label: 'Por Categoría',
      content: (
        <Table
          data={state.data?.inventoryByCategory || []}
          columns={categoryColumns}
          emptyMessage="No hay datos de inventario por categoría"
        />
      )
    },
    {
      id: 'low-stock',
      label: 'Stock Bajo',
      content: (
        <Table
          data={state.data?.lowStockProducts || []}
          columns={lowStockColumns}
          emptyMessage="No hay productos con stock bajo"
        />
      )
    },
    {
      id: 'expiring',
      label: 'Por Vencer',
      content: (
        <Table
          data={state.data?.expiringBatches || []}
          columns={expiringBatchesColumns}
          emptyMessage="No hay lotes próximos a vencer"
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
      {state.data && ((alertsData.lowStock || 0) > 0 || (alertsData.outOfStock || 0) > 0 || (alertsData.expiringSoon || 0) > 0) && (
        <Alert variant="warning">
          <div className="text-gray-700">
            <strong>Atención Requerida:</strong>
            {(alertsData.lowStock || 0) > 0 && (
              <span> {alertsData.lowStock} productos con stock bajo.</span>
            )}
            {(alertsData.outOfStock || 0) > 0 && (
              <span> {alertsData.outOfStock} productos sin stock.</span>
            )}
            {(alertsData.expiringSoon || 0) > 0 && (
              <span> {alertsData.expiringSoon} lotes próximos a vencer.</span>
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
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Reporte de Inventario</h3>
          <p className="text-gray-500 mb-4">Selecciona los filtros y haz clic en "Generar Reporte" para comenzar.</p>
          <p className="text-sm text-gray-400">
            Este reporte incluye análisis de stock, alertas y productos próximos a vencer.
          </p>
        </div>
      )}
    </div>
  );
};