// src/components/reports/InventoryReport.tsx
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
import { InventoryReportData, ReportProps } from '@/types/reports';
import { 
  ProductStoreResponse, 
  ProductResponse, 
  StoreResponse, 
  ProductBatchResponse 
} from '@/types';
import { productStoreAPI, productAPI, storeAPI, productBatchAPI } from '@/services/api';

interface InventoryReportState {
  data: InventoryReportData | null;
  loading: boolean;
  error: string | null;
  selectedStoreId: number | null;
}

export const InventoryReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<InventoryReportState>({
    data: null,
    loading: false,
    error: null,
    selectedStoreId: null
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
      // Obtener datos de inventario
      const [productStores, productBatches] = await Promise.all([
        productStoreAPI.getAllProductStores(),
        productBatchAPI.getAllBatches()
      ]);

      // Filtrar por tienda si está seleccionada
      const filteredProductStores = state.selectedStoreId 
        ? productStores.filter((ps: ProductStoreResponse) => ps.store.id === state.selectedStoreId)
        : productStores;

      const filteredBatches = state.selectedStoreId
        ? productBatches.filter((batch: ProductBatchResponse) => 
            batch.store && batch.store.id === state.selectedStoreId)
        : productBatches;

      // Calcular métricas generales
      const totalProducts = filteredProductStores.length;
      const lowStockProducts = filteredProductStores.filter((ps: ProductStoreResponse) => 
        ps.currentStock <= ps.minStockLevel).length;
      
      // Productos vencidos
      const today = new Date();
      const expiredBatches = filteredBatches.filter((batch: ProductBatchResponse) => 
        new Date(batch.expirationDate) < today);
      const expiredProducts = expiredBatches.length;

      // Valor total del stock
      const totalStockValue = filteredProductStores.reduce((sum: number, ps: ProductStoreResponse) => {
        const product = products.find((p: ProductResponse) => p.id === ps.product.id);
        return sum + (ps.currentStock * (product?.productionCost || 0));
      }, 0);

      // Inventario por tienda
      const inventoryByStore = stores.map((store: StoreResponse) => {
        const storeProductStores = productStores.filter((ps: ProductStoreResponse) => 
          ps.store.id === store.id);
        
        const productsCount = storeProductStores.length;
        const totalStock = storeProductStores.reduce((sum: number, ps: ProductStoreResponse) => 
          sum + ps.currentStock, 0);
        const stockValue = storeProductStores.reduce((sum: number, ps: ProductStoreResponse) => {
          const product = products.find((p: ProductResponse) => p.id === ps.product.id);
          return sum + (ps.currentStock * (product?.productionCost || 0));
        }, 0);

        return {
          storeName: store.name,
          productsCount,
          totalStock,
          stockValue
        };
      }).filter(item => item.productsCount > 0);

      // Rotación de productos
      const productRotation = filteredProductStores.map((ps: ProductStoreResponse) => {
        const product = products.find((p: ProductResponse) => p.id === ps.product.id);
        const stockRatio = ps.currentStock / Math.max(ps.minStockLevel, 1);
        
        let status: 'normal' | 'low' | 'critical';
        if (ps.currentStock === 0) {
          status = 'critical';
        } else if (ps.currentStock <= ps.minStockLevel) {
          status = 'low';
        } else {
          status = 'normal';
        }

        // Estimación simple de días de stock (asumiendo rotación promedio)
        const averageDailySales = 5; // Valor estimado, en un caso real se calcularía con datos históricos
        const daysOfStock = ps.currentStock / Math.max(averageDailySales, 1);

        return {
          productName: product?.nameProduct || 'Producto desconocido',
          currentStock: ps.currentStock,
          minStockLevel: ps.minStockLevel,
          status,
          daysOfStock: Math.round(daysOfStock)
        };
      });

      // Lotes vencidos
      const expiredBatchesData = expiredBatches.map((batch: ProductBatchResponse) => ({
        batchCode: batch.batchCode,
        productName: batch.product.nameProduct,
        expirationDate: batch.expirationDate,
        quantity: batch.currentQuantity
      }));

      const reportData: InventoryReportData = {
        totalProducts,
        lowStockProducts,
        expiredProducts,
        totalStockValue,
        inventoryByStore,
        productRotation: productRotation.sort((a, b) => {
          if (a.status === 'critical' && b.status !== 'critical') return -1;
          if (a.status !== 'critical' && b.status === 'critical') return 1;
          if (a.status === 'low' && b.status === 'normal') return -1;
          if (a.status === 'normal' && b.status === 'low') return 1;
          return 0;
        }),
        expiredBatches: expiredBatchesData
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
  }, [state.selectedStoreId, stores, products]);

  const handleStoreChange = (storeId: string): void => {
    setState(prev => ({
      ...prev,
      selectedStoreId: storeId ? parseInt(storeId) : null
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    const csvContent = [
      'Reporte de Inventario',
      `Generado: ${formatters.dateTime(new Date())}`,
      '',
      'Resumen General',
      `Total Productos,${state.data.totalProducts}`,
      `Productos con Stock Bajo,${state.data.lowStockProducts}`,
      `Productos Vencidos,${state.data.expiredProducts}`,
      `Valor Total Stock,${formatters.currency(state.data.totalStockValue)}`,
      '',
      'Inventario por Tienda',
      'Tienda,Productos,Stock Total,Valor Stock',
      ...state.data.inventoryByStore.map(item => 
        `${item.storeName},${item.productsCount},${item.totalStock},${item.stockValue}`
      ),
      '',
      'Rotación de Productos',
      'Producto,Stock Actual,Stock Mínimo,Estado,Días de Stock',
      ...state.data.productRotation.map(item => 
        `${item.productName},${item.currentStock},${item.minStockLevel},${item.status},${item.daysOfStock}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-inventario-${Date.now()}.csv`;
    link.click();
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
    { key: 'storeName', header: 'Tienda',
        render: (value: string) => <span className='text-gray-800'>{(value)}</span>
     },
    { key: 'productsCount', header: 'Productos',
        render: (value: string) => <span className='text-gray-800'>{(value)}</span>
     },
    { key: 'totalStock', header: 'Stock Total',
        render: (value: number) => <span className='text-gray-800'>{(value)}</span>
     },
    { 
      key: 'stockValue', 
      header: 'Valor Stock',
      render: (value: number) => <span className='text-gray-800'>{formatters.currency(value)}</span>
    }
  ];

  const rotationColumns = [
    { key: 'productName', header: 'Producto', render: (value: string) => <span className='text-gray-800'>{(value)}</span> },
    { key: 'currentStock', header: 'Stock Actual',render: (value: number) => <span className='text-gray-800'>{(value)}</span> },
    { key: 'minStockLevel', header: 'Stock Mínimo', render: (value: number) => <span className='text-gray-800'>{(value)}</span> },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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