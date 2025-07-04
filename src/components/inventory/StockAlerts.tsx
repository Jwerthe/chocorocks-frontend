// src/components/inventory/StockAlerts.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { StockAlert, ProductBatchResponse } from '@/types';
import { productStoreAPI, productBatchAPI } from '@/services/api';

export const StockAlerts: React.FC = () => {
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchStockAlerts();
    fetchExpiringBatches();
  }, []);

  const fetchStockAlerts = async () => {
    setLoading(true);
    try {
      const data = await productStoreAPI.getLowStockAlerts();
      setStockAlerts(data);
    } catch (err) {
      setError('Error al cargar las alertas de stock');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringBatches = async () => {
    try {
      const data = await productBatchAPI.getExpiringBatches(30);
      setExpiringBatches(data);
    } catch (err) {
      console.error('Error al cargar lotes próximos a vencer:', err);
    }
  };

  const getAlertVariant = (alertLevel: string) => {
    switch (alertLevel) {
      case 'CRITICAL':
        return 'danger' as const;
      case 'LOW':
        return 'warning' as const;
      case 'OUT_OF_STOCK':
        return 'danger' as const;
      default:
        return 'warning' as const;
    }
  };

  const stockAlertsColumns = [
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string, row: StockAlert) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
        </div>
      ),
    },
    {
      key: 'store.name',
      header: 'Tienda',
      render: (value: string) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: 'currentStock',
      header: 'Stock Actual',
      render: (value: number) => <span className="font-bold text-red-600">{value}</span>,
    },
    {
      key: 'minStockLevel',
      header: 'Stock Mínimo',
      render: (value: number) => value,
    },
    {
      key: 'alertLevel',
      header: 'Nivel de Alerta',
      render: (value: string) => (
        <Badge variant={getAlertVariant(value)}>
          {value === 'CRITICAL' ? 'Crítico' : 
           value === 'LOW' ? 'Bajo' : 
           value === 'OUT_OF_STOCK' ? 'Sin Stock' : value}
        </Badge>
      ),
    },
  ];

  const expiringBatchesColumns = [
    {
      key: 'batchCode',
      header: 'Código de Lote',
      render: (value: string) => <span className="font-mono text-sm font-bold">{value}</span>,
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string, row: ProductBatchResponse) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
        </div>
      ),
    },
    {
      key: 'currentQuantity',
      header: 'Cantidad',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'expirationDate',
      header: 'Fecha de Vencimiento',
      render: (value: string) => {
        const daysUntilExpiration = Math.ceil((new Date(value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <div>{new Date(value).toLocaleDateString()}</div>
            <Badge variant={daysUntilExpiration <= 7 ? 'danger' : 'warning'} size="sm">
              {daysUntilExpiration <= 0 ? 'Vencido' : `${daysUntilExpiration} días`}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'store',
      header: 'Ubicación',
      render: (value: any) => (
        <Badge variant="secondary">
          {value ? value.name : 'Bodega Central'}
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
        <Button onClick={() => { fetchStockAlerts(); fetchExpiringBatches(); }}>
          Actualizar
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Resumen de alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alertas de Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{stockAlerts.length}</p>
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
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alertas</p>
              <p className="text-2xl font-bold text-blue-600">{stockAlerts.length + expiringBatches.length}</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertas de stock bajo */}
      {stockAlerts.length > 0 && (
        <Card title="Productos con Stock Bajo" className="border-l-4 border-l-red-500">
          <Table
            data={stockAlerts}
            columns={stockAlertsColumns}
            emptyMessage="No hay alertas de stock bajo"
          />
        </Card>
      )}

      {/* Lotes próximos a vencer */}
      {expiringBatches.length > 0 && (
        <Card title="Lotes Próximos a Vencer (30 días)" className="border-l-4 border-l-yellow-500">
          <Table
            data={expiringBatches}
            columns={expiringBatchesColumns}
            emptyMessage="No hay lotes próximos a vencer"
          />
        </Card>
      )}

      {/* Mensaje cuando no hay alertas */}
      {stockAlerts.length === 0 && expiringBatches.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">¡Todo está en orden!</h3>
            <p className="text-gray-600">No hay alertas de inventario en este momento.</p>
          </div>
        </Card>
      )}
    </div>
  );
};