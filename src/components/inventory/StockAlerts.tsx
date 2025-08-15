// src/components/inventory/StockAlerts.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { StockAlert, ProductBatchResponse } from '@/types';
import { productAPI, productStoreAPI, productBatchAPI, ApiError } from '@/services/api';
import { useNotification } from '@/hooks/useNotification';
import { useRouter } from 'next/navigation';

// TypeScript interfaces
interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface AlertStats {
  totalAlerts: number;
  criticalAlerts: number;
  expiredBatches: number;
  criticallyExpiring: number;
}

type AlertLevel = 'CRITICAL' | 'LOW' | 'OUT_OF_STOCK';
type BadgeVariant = 'success' | 'warning' | 'danger';

export const StockAlerts: React.FC = () => {
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { success, error: notifyError } = useNotification();
  const router = useRouter();

  // Helper functions (no dependencies needed)
  const getAlertVariant = (alertLevel: string): BadgeVariant => {
    switch (alertLevel) {
      case 'CRITICAL':
      case 'OUT_OF_STOCK':
        return 'danger';
      case 'LOW':
        return 'warning';
      default:
        return 'warning';
    }
  };

  const getExpirationVariant = (expirationDate: string): BadgeVariant => {
    const daysUntilExpiration = Math.ceil(
      (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration <= 0) return 'danger';
    if (daysUntilExpiration <= 7) return 'danger';
    if (daysUntilExpiration <= 30) return 'warning';
    return 'success';
  };

  const getDaysUntilExpiration = (expirationDate: string): number => {
    return Math.ceil(
      (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  // API functions - with corrected logic for actual stock levels
  const generateStockAlerts = useCallback(async (): Promise<StockAlert[]> => {
    try {
      // Obtener datos de productos
      const products = await productAPI.getAllProducts();
      console.log('🔍 Products data:', products);
      
      const alerts: StockAlert[] = [];
      const LOW_STOCK_THRESHOLD = 10; // Umbral para considerar stock bajo
      
      // Filtrar productos que tienen stock bajo (usando minStockLevel como stock actual)
      products
        .filter(product => {
          const actualStock = product.minStockLevel; // En realidad es el stock actual
          const isLowStock = actualStock < LOW_STOCK_THRESHOLD && product.isActive;
          console.log(`📦 ${product.nameProduct}: Stock Actual=${actualStock}, Umbral=${LOW_STOCK_THRESHOLD}, IsLow=${isLowStock}`);
          return isLowStock;
        })
        .forEach(product => {
          const actualStock = product.minStockLevel; // En realidad es el stock actual
          alerts.push({
            id: product.id,
            product: product,
            store: {
              id: 1,
              name: 'Inventario General',
              address: '',
              typeStore: 'BODEGA' as any,
              isActive: true,
              createdAt: '',
              updatedAt: ''
            },
            currentStock: actualStock, // Stock actual real
            minStockLevel: LOW_STOCK_THRESHOLD, // Umbral de stock bajo
            alertLevel: (actualStock === 0 ? 'OUT_OF_STOCK' : 
                       actualStock <= 3 ? 'CRITICAL' : 'LOW') as AlertLevel,
            createdAt: new Date().toISOString(),
          });
        });
      
      console.log('🚨 Generated stock alerts:', alerts);
      return alerts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las alertas de stock';
      console.error('Error generating stock alerts:', err);
      throw new Error(errorMessage);
    }
  }, []); // No dependencies to avoid loops

  const generateExpiringBatches = useCallback(async (): Promise<ProductBatchResponse[]> => {
    try {
      const allBatches = await productBatchAPI.getAllBatches();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + 30);
      
      return allBatches.filter(batch => {
        const expirationDate = new Date(batch.expirationDate);
        return expirationDate <= cutoffDate && 
               batch.currentQuantity > 0 && 
               batch.isActive;
      });
    } catch (err) {
      console.error('Error al cargar lotes próximos a vencer:', err);
      throw new Error('Error al cargar lotes próximos a vencer');
    }
  }, []); // No dependencies to avoid loops

  // Main fetch function
  const fetchData = useCallback(async (): Promise<void> => {
    if (loading) return; // Prevent concurrent calls
    
    setLoading(true);
    setError('');
    
    try {
      const [alerts, batches] = await Promise.all([
        generateStockAlerts(),
        generateExpiringBatches()
      ]);
      
      setStockAlerts(alerts);
      setExpiringBatches(batches);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // Empty array to avoid loops

  // Only run once on mount
  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array to run only once

  // Manual refresh function
  const handleRefresh = (): void => {
    fetchData();
  };

  // Calculate statistics with corrected logic
  const alertStats: AlertStats = {
    totalAlerts: stockAlerts.length + expiringBatches.length,
    criticalAlerts: stockAlerts.filter(alert => 
      alert.alertLevel === 'CRITICAL' || alert.alertLevel === 'OUT_OF_STOCK'
    ).length,
    expiredBatches: expiringBatches.filter(batch => 
      new Date(batch.expirationDate) < new Date()
    ).length,
    criticallyExpiring: expiringBatches.filter(batch => {
      const days = getDaysUntilExpiration(batch.expirationDate);
      return days <= 7 && days >= 0;
    }).length,
  };

  // Navigation function
  const handleViewProduct = useCallback((productId: number): void => {
    // Navegar a la página de productos
    router.push(`/products?edit=${productId}`);
  }, [router]);

  // Table columns with proper typing - UPDATED COLUMNS
  const stockAlertsColumns: TableColumn<StockAlert>[] = [
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: unknown, row: StockAlert): React.ReactNode => (
        <div>
          <div className="font-medium text-gray-800">{row.product.nameProduct}</div>
          <div className="text-sm text-gray-600">
            <span className="font-mono text-xs">{row.product.code}</span>
            {row.product.flavor && ` • ${row.product.flavor}`}
            {row.product.size && ` • ${row.product.size}`}
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Stock Actual',
      render: (value: unknown, row: StockAlert): React.ReactNode => (
        <span className={`font-bold text-lg ${
          row.alertLevel === 'OUT_OF_STOCK' ? 'text-red-600' : 
          row.alertLevel === 'CRITICAL' ? 'text-red-500' : 'text-orange-600'
        }`}>
          {row.currentStock}
        </span>
      ),
    },
    {
      key: 'alertLevel',
      header: 'Nivel de Alerta',
      render: (value: unknown, row: StockAlert): React.ReactNode => (
        <Badge variant={getAlertVariant(row.alertLevel)}>
          {row.alertLevel === 'CRITICAL' ? 'Crítico' : 
           row.alertLevel === 'LOW' ? 'Bajo' : 
           row.alertLevel === 'OUT_OF_STOCK' ? 'Sin Stock' : row.alertLevel}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Detalles',
      render: (value: unknown, row: StockAlert): React.ReactNode => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewProduct(row.product.id)}
        >
          Ver
        </Button>
      ),
    },
  ];

  const expiringBatchesColumns: TableColumn<ProductBatchResponse>[] = [
    {
      key: 'batchCode',
      header: 'Código de Lote',
      render: (value: unknown): React.ReactNode => (
        <span className="font-mono text-sm font-bold text-gray-700">{String(value)}</span>
      ),
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: unknown, row: ProductBatchResponse): React.ReactNode => (
        <div>
          <div className="font-medium text-gray-800">{row.product.nameProduct}</div>
          <div className="text-sm text-gray-600">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
        </div>
      ),
    },
    {
      key: 'currentQuantity',
      header: 'Cantidad',
      render: (value: unknown): React.ReactNode => (
        <span className="font-bold text-gray-800">{Number(value)}</span>
      ),
    },
    {
      key: 'expirationDate',
      header: 'Fecha de Vencimiento',
      render: (value: unknown, row: ProductBatchResponse): React.ReactNode => {
        const daysUntilExpiration = getDaysUntilExpiration(row.expirationDate);
        return (
          <div>
            <div className="text-gray-700">
              {new Date(row.expirationDate).toLocaleDateString('es-ES')}
            </div>
            <Badge variant={getExpirationVariant(row.expirationDate)} size="sm">
              {daysUntilExpiration <= 0 ? 'Vencido' : `${daysUntilExpiration} días`}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'store',
      header: 'Ubicación',
      render: (value: unknown, row: ProductBatchResponse): React.ReactNode => (
        <Badge variant="secondary">
          {row.store ? row.store.name : 'Bodega Central'}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas de Inventario</h2>
          <p className="text-gray-600 mt-1">Monitoreo de stock bajo y productos próximos a vencer</p>
        </div>
        <Button onClick={handleRefresh} isLoading={loading}>
          Actualizar
        </Button>
      </div>

      {error && (
        <BackendErrorHandler 
          error={error}
          onRetry={handleRefresh}
          title="Error al cargar Alertas"
          description="No se pudieron cargar las alertas de inventario. Verifica la conexión con el backend."
        />
      )}

      {/* Resumen de alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo (&lt;10)</p>
              <p className="text-2xl font-bold text-red-600">{stockAlerts.length}</p>
              {alertStats.criticalAlerts > 0 && (
                <p className="text-xs text-red-500">{alertStats.criticalAlerts} críticos</p>
              )}
            </div>
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Próximos a Vencer</p>
              <p className="text-2xl font-bold text-yellow-600">{expiringBatches.length}</p>
              {alertStats.criticallyExpiring > 0 && (
                <p className="text-xs text-yellow-600">{alertStats.criticallyExpiring} en 7 días</p>
              )}
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productos Vencidos</p>
              <p className="text-2xl font-bold text-red-700">{alertStats.expiredBatches}</p>
            </div>
            <div className="text-red-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alertas</p>
              <p className="text-2xl font-bold text-blue-600">{alertStats.totalAlerts}</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertas de stock bajo - SIEMPRE MOSTRAR */}
      {/* <Card 
        title={`Productos con Stock Bajo - Menos de 10 unidades (${stockAlerts.length})`} 
        className="border-l-4 border-l-red-500"
      >
        {stockAlerts.length > 0 ? (
          <Table
            data={stockAlerts}
            columns={stockAlertsColumns}
            emptyMessage="No hay alertas de stock bajo"
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Stock en niveles óptimos</h4>
            <p className="text-sm text-gray-600">Todos los productos tienen más de 10 unidades en stock.</p>
          </div>
        )}
      </Card> */}

      {/* Lotes próximos a vencer - SIEMPRE MOSTRAR */}
      <Card 
        title={`Lotes Próximos a Vencer - 30 días (${expiringBatches.length})`} 
        className="border-l-4 border-l-yellow-500"
      >
        {expiringBatches.length > 0 ? (
          <Table
            data={expiringBatches}
            columns={expiringBatchesColumns}
            emptyMessage="No hay lotes próximos a vencer"
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Sin productos próximos a vencer</h4>
            <p className="text-sm text-gray-600">No hay lotes que venzan en los próximos 30 días.</p>
          </div>
        )}
      </Card>

      {/* Mensaje de estado general cuando todo está bien */}
      {stockAlerts.length === 0 && expiringBatches.length === 0 && !loading && !error && (
        <Card className="border-l-4 border-l-green-500">
          <div className="text-center py-6">
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">🎉 ¡Inventario en perfecto estado!</h3>
            <p className="text-gray-600">
              Todos los productos tienen stock suficiente y no hay lotes próximos a vencer.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};