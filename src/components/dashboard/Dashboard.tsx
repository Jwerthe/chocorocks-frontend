// src/components/dashboard/Dashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { 
  DashboardData, 
  StockAlert, 
  InventoryMovementResponse,
  ProductBatchResponse 
} from '@/types';
import { 
  dashboardAPI, 
  productStoreAPI, 
  inventoryMovementAPI,
  productBatchAPI 
} from '@/services/api';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [recentMovements, setRecentMovements] = useState<InventoryMovementResponse[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [
        dashboard,
        alerts,
        movements,
        expiring
      ] = await Promise.all([
        dashboardAPI.getDashboardData(),
        productStoreAPI.getLowStockAlerts(),
        inventoryMovementAPI.getMovementsByDateRange(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        ),
        productBatchAPI.getExpiringBatches(30)
      ]);

      setDashboardData(dashboard);
      setStockAlerts(alerts);
      setRecentMovements(movements.slice(0, 5));
      setExpiringBatches(expiring.slice(0, 5));
      setError('');
    } catch (err) {
      setError('Error al cargar los datos del dashboard');
      // Set default values to prevent UI breaks
      setDashboardData({
        totalProducts: 0,
        totalCategories: 0,
        totalStores: 0,
        lowStockAlerts: 0,
        recentMovements: [],
        stockAlerts: []
      });
      setStockAlerts([]);
      setRecentMovements([]);
      setExpiringBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    fetchDashboardData();
  };

  const getMovementTypeIcon = (type: string): string => {
    switch (type) {
      case 'IN':
        return '↗️';
      case 'OUT':
        return '↘️';
      case 'TRANSFER':
        return '↔️';
      default:
        return '📦';
    }
  };

  const getMovementTypeColor = (type: string): 'success' | 'danger' | 'secondary' => {
    switch (type) {
      case 'IN':
        return 'success';
      case 'OUT':
        return 'danger';
      case 'TRANSFER':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const recentMovementsColumns: TableColumn<InventoryMovementResponse>[] = [
    {
      key: 'movementType',
      header: 'Tipo',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <span>{getMovementTypeIcon(value)}</span>
          <Badge variant={getMovementTypeColor(value)} size="sm">
            {value === 'IN' ? 'Entrada' : value === 'OUT' ? 'Salida' : 'Transferencia'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string) => <span className="font-medium text-sm">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'movementDate',
      header: 'Fecha',
      render: (value: string) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const expiringBatchesColumns: TableColumn<ProductBatchResponse>[] = [
    {
      key: 'batchCode',
      header: 'Lote',
      render: (value: string) => <span className="font-mono text-xs sm:text-sm">{value}</span>,
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string) => <span className="font-medium text-sm">{value}</span>,
    },
    {
      key: 'currentQuantity',
      header: 'Cantidad',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'expirationDate',
      header: 'Vencimiento',
      render: (value: string) => {
        const daysUntil = Math.ceil((new Date(value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <div className="text-xs sm:text-sm">{new Date(value).toLocaleDateString()}</div>
            <Badge variant={daysUntil <= 7 ? 'danger' : 'warning'} size="sm">
              {daysUntil <= 0 ? 'Vencido' : `${daysUntil} días`}
            </Badge>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#7ca1eb] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Resumen general del sistema de inventario
          </p>
        </div>
        <Button onClick={handleRefresh} className="self-start sm:self-auto">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {dashboardData?.totalProducts || 0}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <Link href="/products" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Ver productos →
            </Link>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorías</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {dashboardData?.totalCategories || 0}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <Link href="/products" className="text-sm text-green-600 hover:text-green-800 font-medium">
              Gestionar categorías →
            </Link>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiendas Activas</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                {dashboardData?.totalStores || 0}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alertas de Stock</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">
                {stockAlerts.length}
              </p>
            </div>
            <div className="text-red-500">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <Link href="/alerts" className="text-sm text-red-600 hover:text-red-800 font-medium">
              Ver alertas →
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/products" className="block">
            <div className="p-4 border-2 border-black bg-[#7ca1eb] text-white hover:bg-[#6b90da] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Gestionar Productos</h3>
                  <p className="text-xs sm:text-sm opacity-90">Crear, editar y ver productos</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventory" className="block">
            <div className="p-4 border-2 border-black bg-green-500 text-white hover:bg-green-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Control de Inventario</h3>
                  <p className="text-xs sm:text-sm opacity-90">Lotes, stock y movimientos</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/alerts" className="block">
            <div className="p-4 border-2 border-black bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Ver Alertas</h3>
                  <p className="text-xs sm:text-sm opacity-90">Stock bajo y vencimientos</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card title="Movimientos Recientes" subtitle="Últimos 5 movimientos de inventario">
          {recentMovements.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table
                  data={recentMovements}
                  columns={recentMovementsColumns}
                  emptyMessage="No hay movimientos recientes"
                />
              </div>
              <div className="text-center">
                <Link href="/inventory" className="text-sm text-[#7ca1eb] hover:text-[#6b90da] font-medium">
                  Ver todos los movimientos →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" clipRule="evenodd" />
              </svg>
              <p>No hay movimientos recientes</p>
            </div>
          )}
        </Card>

        <Card title="Próximos a Vencer" subtitle="Lotes que vencen en los próximos 30 días">
          {expiringBatches.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table
                  data={expiringBatches}
                  columns={expiringBatchesColumns}
                  emptyMessage="No hay lotes próximos a vencer"
                />
              </div>
              <div className="text-center">
                <Link href="/alerts" className="text-sm text-[#7ca1eb] hover:text-[#6b90da] font-medium">
                  Ver todas las alertas →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p>No hay lotes próximos a vencer</p>
            </div>
          )}
        </Card>
      </div>

      {/* Stock Alerts Summary */}
      {stockAlerts.length > 0 && (
        <Card title="Resumen de Alertas de Stock" className="border-l-4 border-l-red-500">
          <div className="space-y-3">
            {stockAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 border border-red-200 space-y-2 sm:space-y-0">
                <div>
                  <p className="font-medium text-red-800">{alert.product.nameProduct}</p>
                  <p className="text-sm text-red-600">
                    {alert.store.name} - Stock: {alert.currentStock} (Mín: {alert.minStockLevel})
                  </p>
                </div>
                <Badge variant="danger">{alert.alertLevel}</Badge>
              </div>
            ))}
            {stockAlerts.length > 3 && (
              <div className="text-center pt-3">
                <Link href="/alerts" className="text-sm text-red-600 hover:text-red-800 font-medium">
                  Ver {stockAlerts.length - 3} alertas más →
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};