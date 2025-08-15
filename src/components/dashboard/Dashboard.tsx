'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  productAPI, 
  categoryAPI, 
  storeAPI, 
  clientAPI, 
  inventoryMovementAPI,
  productBatchAPI 
} from '@/services/api';
import { 
  ProductResponse, 
  CategoryResponse, 
  StoreResponse, 
  ClientResponse,
  InventoryMovementResponse,
  ProductBatchResponse
} from '@/types';
import { formatters } from '@/utils/formatters';

// TypeScript interfaces
interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  activeStores: number;
  activeClients: number;
  stockAlerts: number;
  totalSales: number;
}

interface StockAlert {
  productName: string;
  storeName: string;
  currentStock: number;
  minStockLevel: number;
  status: 'low' | 'critical';
}

interface RecentMovement {
  id: number;
  productName: string;
  movementType: string;
  quantity: number;
  storeName?: string;
  date: string;
}

interface ExpiringBatch {
  id: number;
  productName: string;
  batchCode: string;
  expirationDate: string;
  currentQuantity: number;
  daysUntilExpiry: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalCategories: 0,
    activeStores: 0,
    activeClients: 0,
    stockAlerts: 0,
    totalSales: 0,
  });
  
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Intentar cargar datos desde el backend
      const [
        products,
        categories,
        stores,
        clients,
        movements,
        batches
      ] = await Promise.all([
        productAPI.getAllProducts().catch(() => []),
        categoryAPI.getAllCategories().catch(() => []),
        storeAPI.getAllStores().catch(() => []),
        clientAPI.getAllClients().catch(() => []),
        inventoryMovementAPI.getAllMovements().catch(() => []),
        productBatchAPI.getAllBatches().catch(() => [])
      ]);

      // Verificar si hay datos válidos
      const hasValidData = products.length > 0 || categories.length > 0 || stores.length > 0;
      
      if (!hasValidData) {
        // Si no hay datos, mostrar datos de ejemplo y error
        setError('No se pudo conectar con el backend');
        
        // Datos vacíos para mostrar la funcionalidad
        setStats({
          totalProducts: 0,
          activeProducts: 0, 
          totalCategories: 0,
          activeStores: 0,
          activeClients: 0,
          stockAlerts: 0,
          totalSales: 0,
        });

        setStockAlerts([]);
        setRecentMovements([]);
        setExpiringBatches([]);
        return;
      }

      // Calcular estadísticas reales
      const activeProducts = products.filter((p: ProductResponse) => p.isActive);
      const activeStores = stores.filter((s: StoreResponse) => s.isActive);
      const activeClients = clients.filter((c: ClientResponse) => c.isActive);

      // ✅ Calcular alertas de stock CORREGIDO - usando misma lógica que StockAlerts
      const alerts = calculateStockAlertsFromProducts(products);
      
      // Movimientos recientes (últimos 5)
      const recentMoves = formatRecentMovements(movements.slice(-5));
      
      // Lotes próximos a vencer (próximos 30 días)
      const expiring = calculateExpiringBatches(batches);

      setStats({
        totalProducts: products.length,
        activeProducts: activeProducts.length,
        totalCategories: categories.length,
        activeStores: activeStores.length,
        activeClients: activeClients.length,
        stockAlerts: alerts.length, // ✅ Ahora usa la cantidad correcta
        totalSales: 0,
      });

      setStockAlerts(alerts);
      setRecentMovements(recentMoves);
      setExpiringBatches(expiring);

      console.log('📊 Dashboard stats updated:', {
        totalProducts: products.length,
        activeProducts: activeProducts.length,
        stockAlerts: alerts.length,
        alerts: alerts
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error al conectar con el backend. Verifica que esté funcionando.');
      
      // Mostrar valores por defecto en caso de error
      setStats({
        totalProducts: 0,
        activeProducts: 0,
        totalCategories: 0,
        activeStores: 0,
        activeClients: 0,
        stockAlerts: 0,
        totalSales: 0,
      });
      
      setStockAlerts([]);
      setRecentMovements([]);
      setExpiringBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NUEVA función para calcular alertas usando la misma lógica que StockAlerts
  const calculateStockAlertsFromProducts = (products: ProductResponse[]): StockAlert[] => {
    const LOW_STOCK_THRESHOLD = 10; // Mismo umbral que StockAlerts
    
    const alerts = products
      .filter((product: ProductResponse) => {
        const actualStock = product.minStockLevel; // En realidad es el stock actual
        const isLowStock = actualStock < LOW_STOCK_THRESHOLD && product.isActive;
        console.log(`📦 Dashboard - ${product.nameProduct}: Stock=${actualStock}, Umbral=${LOW_STOCK_THRESHOLD}, IsLow=${isLowStock}`);
        return isLowStock;
      })
      .map((product: ProductResponse) => {
        const actualStock = product.minStockLevel;
        return {
          productName: product.nameProduct,
          storeName: 'Inventario General',
          currentStock: actualStock,
          minStockLevel: LOW_STOCK_THRESHOLD,
          status: (actualStock === 0 ? 'critical' : actualStock <= 3 ? 'critical' : 'low') as 'low' | 'critical'
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);
    
    console.log('🚨 Dashboard - Generated stock alerts:', alerts);
    return alerts;
  };

  // ✅ FUNCIÓN ORIGINAL (sin cambios) - para mantener compatibilidad si hay productStores
  const calculateStockAlertsFromProductStores = (productStores: any[]): StockAlert[] => {
    return productStores
      .filter((ps: any) => ps.currentStock <= ps.minStockLevel)
      .map((ps: any) => ({
        productName: ps.product.nameProduct,
        storeName: ps.store.name,
        currentStock: ps.currentStock,
        minStockLevel: ps.minStockLevel,
        status: (ps.currentStock === 0 ? 'critical' : 'low') as 'low' | 'critical'
      }))
      .sort((a, b) => a.currentStock - b.currentStock);
  };

  const formatRecentMovements = (movements: InventoryMovementResponse[]): RecentMovement[] => {
    return movements
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime())
      .slice(0, 5)
      .map((movement: InventoryMovementResponse) => ({
        id: movement.id,
        productName: movement.product.nameProduct,
        movementType: movement.movementType,
        quantity: movement.quantity,
        storeName: movement.toStore?.name || movement.fromStore?.name,
        date: movement.movementDate
      }));
  };

  const calculateExpiringBatches = (batches: ProductBatchResponse[]): ExpiringBatch[] => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    return batches
      .filter((batch: ProductBatchResponse) => {
        const expiryDate = new Date(batch.expirationDate);
        return expiryDate <= thirtyDaysFromNow && expiryDate > now && batch.currentQuantity > 0;
      })
      .map((batch: ProductBatchResponse) => {
        const expiryDate = new Date(batch.expirationDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        return {
          id: batch.id,
          productName: batch.product.nameProduct,
          batchCode: batch.batchCode,
          expirationDate: batch.expirationDate,
          currentQuantity: batch.currentQuantity,
          daysUntilExpiry
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const getMovementTypeText = (type: string): string => {
    const types: Record<string, string> = {
      'IN': 'Entrada',
      'OUT': 'Salida',
      'TRANSFER': 'Transferencia'
    };
    return types[type] || type;
  };

  const getMovementColor = (type: string): string => {
    const colors: Record<string, string> = {
      'IN': 'text-green-600',
      'OUT': 'text-red-600',
      'TRANSFER': 'text-blue-600'
    };
    return colors[type] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Resumen general del sistema de inventario</p>
          </div>
          <Button onClick={loadDashboardData} disabled>
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizando...
          </Button>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#7ca1eb] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen general del sistema de inventario</p>
        </div>
        <Button onClick={loadDashboardData}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* API Status Alert */}
      {error && (
        <Alert variant="warning">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>Sin conexión con el backend</strong>
                <p className="text-sm mt-1">Mostrando datos de ejemplo. Verifica que el backend esté funcionando en {process.env.NEXT_PUBLIC_API_URL}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {/* Main Stats Cards - Primera fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Productos */}
        <Link href="/products">
          <Card className="bg-blue-50 border-blue-500 cursor-pointer hover:bg-blue-100 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Productos</p>
                <p className="text-3xl font-bold text-blue-900">{error ? '---' : stats.totalProducts}</p>
                <div className="text-sm text-blue-600 hover:text-blue-800">
                  Ver productos →
                </div>
              </div>
              <div className="bg-blue-500 p-3 rounded">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Categorías */}
        <Link href="/products">
          <Card className="bg-green-50 border-green-500 cursor-pointer hover:bg-green-100 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Categorías</p>
                <p className="text-3xl font-bold text-green-900">{error ? '---' : stats.totalCategories}</p>
                <div className="text-sm text-green-600 hover:text-green-800">
                  Gestionar categorías →
                </div>
              </div>
              <div className="bg-green-500 p-3 rounded">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Tiendas Activas */}
        <Link href="/stores">
          <Card className="bg-purple-50 border-purple-500 cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tiendas Activas</p>
                <p className="text-3xl font-bold text-purple-900">{error ? '---' : stats.activeStores}</p>
                <div className="text-sm text-purple-600 hover:text-purple-800">
                  Gestionar tiendas →
                </div>
              </div>
              <div className="bg-purple-500 p-3 rounded">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Alertas de Stock - ✅ CORREGIDO */}
        <Link href="/alerts">
        <Card className="bg-red-50 border-red-500 cursor-pointer hover:bg-red-100 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Alertas de Stock</p>
              <p className="text-3xl font-bold text-red-900">{error ? '---' : stats.stockAlerts}</p>
              <div className="text-sm text-red-600 hover:text-red-800">
                Ver alertas →
              </div>
            </div>
            <div className="bg-red-500 p-3 rounded">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
        </Link>
      </div>

      {/* Second Stats Row - Segunda fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clientes Registrados */}
        <Link href="/clients">
          <Card className="bg-orange-50 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Clientes Registrados</p>
                <p className="text-3xl font-bold text-orange-900">{error ? '---' : stats.activeClients}</p>
                <div className="text-sm text-orange-600 hover:text-orange-800">
                  Ver clientes →
                </div>
              </div>
              <div className="bg-orange-500 p-3 rounded">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Productos Activos */}
        <Link href="/products">
          <Card className="bg-indigo-50 border-indigo-500 cursor-pointer hover:bg-indigo-100 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Productos Activos</p>
                <p className="text-3xl font-bold text-indigo-900">{error ? '---' : stats.activeProducts}</p>
                <div className="text-sm text-indigo-600 hover:text-indigo-800">
                  Gestionar productos →
                </div>
              </div>
              <div className="bg-indigo-500 p-3 rounded">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/products" className="block">
            <div className="bg-blue-500 text-white p-6 rounded border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-lg">Gestionar Productos</h3>
                  <p className="text-sm opacity-90">Crear, editar y ver productos</p>
                </div>
              </div>
            </div>
          </a>

          <a href="/inventory" className="block">
            <div className="bg-green-500 text-white p-6 rounded border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-lg">Control de Inventario</h3>
                  <p className="text-sm opacity-90">Lotes, stock y movimientos</p>
                </div>
              </div>
            </div>
          </a>

          <a 
            href="/alerts"
            className="block"
          >
            <div className="bg-orange-500 text-white p-6 rounded border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-lg">Ver Alertas</h3>
                  <p className="text-sm opacity-90">Stock bajo y vencimientos</p>
                </div>
              </div>
            </div>
          </a>
        </div>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <Card title="Movimientos Recientes" subtitle="Últimos 5 movimientos de inventario">
          {recentMovements.length === 0 ? (
            <EmptyState
              title="No hay movimientos recientes"
              description="Los movimientos de inventario aparecerán aquí"
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-6 9l2 2 4-4" />
                </svg>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentMovements.map((movement: RecentMovement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{movement.productName}</p>
                    <p className="text-sm text-gray-600">
                      {movement.storeName && `${movement.storeName} • `}
                      {formatters.dateTime(movement.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={movement.movementType === 'IN' ? 'success' : movement.movementType === 'OUT' ? 'danger' : 'primary'}>
                      {getMovementTypeText(movement.movementType)}
                    </Badge>
                    <p className={`text-sm font-medium ${getMovementColor(movement.movementType)}`}>
                      {movement.movementType === 'OUT' ? '-' : '+'}{movement.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expiring Batches */}
        <Card title="Próximos a Vencer" subtitle="Lotes que vencen en los próximos 30 días">
          {expiringBatches.length === 0 ? (
            <EmptyState
              title="No hay lotes próximos a vencer"
              description="Los productos próximos a vencer aparecerán aquí"
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          ) : (
            <div className="space-y-3">
              {expiringBatches.slice(0, 5).map((batch: ExpiringBatch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{batch.productName}</p>
                    <p className="text-sm text-gray-600">
                      Lote: {batch.batchCode} • Cantidad: {batch.currentQuantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vence: {formatters.date(batch.expirationDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={batch.daysUntilExpiry <= 7 ? 'danger' : 'warning'}>
                      {batch.daysUntilExpiry} días
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Stock Alerts Section */}
      {stockAlerts.length > 0 && (
        <Card title="Alertas de Stock" subtitle="Productos con stock bajo o crítico" id="stock-alerts">
          <div className="space-y-3">
            {stockAlerts.slice(0, 10).map((alert: StockAlert, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{alert.productName}</p>
                  <p className="text-sm text-gray-600">{alert.storeName}</p>
                </div>
                <div className="text-right">
                  <Badge variant={alert.status === 'critical' ? 'danger' : 'warning'}>
                    {alert.status === 'critical' ? 'Crítico' : 'Bajo'}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    Stock: {alert.currentStock} (bajo umbral: {alert.minStockLevel})
                  </p>
                </div>
              </div>
            ))}
            
            {stockAlerts.length > 10 && (
              <div className="text-center pt-3">
                <p className="text-sm text-gray-500">
                  Y {stockAlerts.length - 10} alertas más...
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};