// src/components/inventory/ProductStoreList.tsx (UNIFICADO - UN SOLO BOTÓN EDITAR)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductStoreForm } from './ProductStoreForm';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { 
  ProductStoreResponse, 
  StoreResponse, 
  ProductResponse,
  CategoryResponse
} from '@/types';
import { 
  productStoreAPI, 
  storeAPI, 
  productAPI,
  categoryAPI,
  ApiError 
} from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotification } from '@/hooks/useNotification';
import { formatters } from '@/utils/formatters';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface ProductStoreFilters {
  search: string;
  storeId: number | undefined;
  categoryId: number | undefined;
  stockStatus: 'all' | 'normal' | 'low' | 'critical' | 'out';
}

interface StockStatus {
  status: 'normal' | 'low' | 'critical' | 'out';
  label: string;
  variant: 'success' | 'warning' | 'danger';
}

interface SummaryStats {
  totalRelations: number;
  totalStock: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems: number;
}

export const ProductStoreList: React.FC = () => {
  const [productStores, setProductStores] = useState<ProductStoreResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Estados para formulario unificado
  const [showProductStoreForm, setShowProductStoreForm] = useState<boolean>(false);
  const [editingProductStoreForm, setEditingProductStoreForm] = useState<ProductStoreResponse | null>(null);
    
  const [filters, setFilters] = useState<ProductStoreFilters>({
    search: '',
    storeId: undefined,
    categoryId: undefined,
    stockStatus: 'all',
  });

  const debouncedSearch: string = useDebounce(filters.search, 500);
  const { success, error: notifyError } = useNotification();

  const fetchAllData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      console.log('📋 Cargando datos de stock por tienda...');
      
      const [
        productStoreData,
        storesData,
        productsData,
        categoriesData
      ] = await Promise.all([
        productStoreAPI.getAllProductStores(),
        storeAPI.getAllStores(),
        productAPI.getAllProducts(),
        categoryAPI.getAllCategories()
      ]);

      console.log(`✅ Datos cargados: ${productStoreData.length} relaciones producto-tienda`);
      
      setProductStores(productStoreData);
      setStores(storesData.filter((s: StoreResponse) => s.isActive));
      setProducts(productsData.filter((p: ProductResponse) => p.isActive));
      setCategories(categoriesData);
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los datos de stock';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = useCallback((): void => {
    fetchAllData();
  }, [fetchAllData]);

  const handleFilterChange = (field: keyof ProductStoreFilters, value: string | number | undefined): void => {
    setFilters((prev: ProductStoreFilters) => ({ ...prev, [field]: value }));
  };

  const clearFilters = (): void => {
    setFilters({
      search: '',
      storeId: undefined,
      categoryId: undefined,
      stockStatus: 'all',
    });
  };

  // Helper function para determinar estado del stock
  const getStockStatus = (currentStock: number, minStock: number): StockStatus => {
    if (currentStock === 0) {
      return { status: 'out', label: 'Sin Stock', variant: 'danger' };
    }
    if (currentStock <= minStock * 0.5) {
      return { status: 'critical', label: 'Crítico', variant: 'danger' };
    }
    if (currentStock <= minStock) {
      return { status: 'low', label: 'Bajo', variant: 'warning' };
    }
    return { status: 'normal', label: 'Normal', variant: 'success' };
  };

  // Lógica de filtrado
  const filteredProductStores: ProductStoreResponse[] = productStores.filter((ps: ProductStoreResponse): boolean => {
    const matchesSearch = !filters.search || 
      ps.product.nameProduct.toLowerCase().includes(filters.search.toLowerCase()) ||
      ps.store.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      ps.product.code.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStore = !filters.storeId || ps.store.id === filters.storeId;
    const matchesCategory = !filters.categoryId || ps.product.category.id === filters.categoryId;
    
    const stockStatus = getStockStatus(ps.currentStock, ps.minStockLevel).status;
    const matchesStockStatus = filters.stockStatus === 'all' || stockStatus === filters.stockStatus;

    return matchesSearch && matchesStore && matchesCategory && matchesStockStatus;
  });

  // Opciones para los selects
  const storeOptions: SelectOption[] = [
    { value: '', label: 'Todas las tiendas' },
    ...stores.map((store: StoreResponse) => ({ value: store.id, label: store.name }))
  ];

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...categories.map((category: CategoryResponse) => ({ 
      value: category.id, 
      label: category.name 
    }))
  ];

  const stockStatusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'normal', label: 'Stock Normal' },
    { value: 'low', label: 'Stock Bajo' },
    { value: 'critical', label: 'Stock Crítico' },
    { value: 'out', label: 'Sin Stock' },
  ];

  // Funciones para ProductStoreForm unificado
  const handleEditProductStore = (productStore: ProductStoreResponse): void => {
    setEditingProductStoreForm(productStore);
    setShowProductStoreForm(true);
  };

  const handleProductStoreFormClose = (): void => {
    setShowProductStoreForm(false);
    setEditingProductStoreForm(null);
  };

  const handleProductStoreFormSuccess = (): void => {
    fetchAllData();
    success(editingProductStoreForm ? 'Relación actualizada correctamente' : 'Producto agregado a tienda correctamente');
  };

  // Definición de columnas de la tabla (UNIFICADO - UN SOLO BOTÓN)
  const columns: TableColumn<ProductStoreResponse>[] = [
    {
      key: 'store.name',
      header: 'Tienda',
      render: (value: unknown, row: ProductStoreResponse): React.ReactNode => (
        <div>
          <div className="font-medium text-gray-800">{String(value)}</div>
          <div className="text-sm text-gray-600">{row.store.address}</div>
        </div>
      ),
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: unknown, row: ProductStoreResponse): React.ReactNode => (
        <div>
          <div className="font-medium text-gray-800">{String(value)}</div>
          <div className="text-sm text-gray-600">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.category.name}
          </div>
          <div className="text-xs text-blue-600 font-mono">
            Código: {row.product.code}
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Stock Actual',
      render: (value: unknown, row: ProductStoreResponse): React.ReactNode => {
        const stockInfo = getStockStatus(row.currentStock, row.minStockLevel);
        return (
          <div className="text-center">
            <div className={`font-bold text-lg ${
              stockInfo.status === 'normal' ? 'text-green-600' : 
              stockInfo.status === 'low' ? 'text-yellow-600' : 
              stockInfo.status === 'critical' ? 'text-orange-600' : 'text-red-600'
            }`}>
              {Number(value)}
            </div>
            <Badge variant={stockInfo.variant} size="sm">
              {stockInfo.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'minStockLevel',
      header: 'Stock Mínimo',
      render: (value: unknown): React.ReactNode => (
        <div className="text-center">
          <span className="text-gray-700 font-medium">{Number(value)}</span>
        </div>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Última Actualización',
      render: (value: unknown): React.ReactNode => (
        <span className="text-sm text-gray-600">
          {formatters.date(String(value), 'short')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: unknown, row: ProductStoreResponse): React.ReactNode => (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditProductStore(row)}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  // Cálculos de resumen
  const summaryStats: SummaryStats = {
    totalRelations: filteredProductStores.length,
    totalStock: filteredProductStores.reduce((sum: number, ps: ProductStoreResponse) => sum + ps.currentStock, 0),
    lowStockItems: filteredProductStores.filter((ps: ProductStoreResponse) => 
      getStockStatus(ps.currentStock, ps.minStockLevel).status === 'low'
    ).length,
    criticalStockItems: filteredProductStores.filter((ps: ProductStoreResponse) => 
      getStockStatus(ps.currentStock, ps.minStockLevel).status === 'critical'
    ).length,
    outOfStockItems: filteredProductStores.filter((ps: ProductStoreResponse) => ps.currentStock === 0).length,
  };

  const handleSelectChange = (field: keyof ProductStoreFilters) => 
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = e.target.value;
      if (field === 'storeId' || field === 'categoryId') {
        handleFilterChange(field, value ? parseInt(value) : undefined);
      } else {
        handleFilterChange(field, value as ProductStoreFilters['stockStatus']);
      }
    };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    handleFilterChange('search', e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock por Tienda</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Gestión de inventario distribuido por ubicación
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            variant="secondary"
            onClick={handleRefresh}
            className="w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </Button>
          <Button 
            onClick={() => setShowProductStoreForm(true)}
            className="w-full sm:w-auto"
          >
            + Agregar Producto a Tienda
          </Button>
        </div>
      </div>

      {error && (
        <BackendErrorHandler 
          error={error}
          onRetry={handleRefresh}
          title="Error al cargar Stock por Tienda"
          description="No se pudieron cargar los datos de stock distribuido. Verifica la conexión con el backend."
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-blue-600">{summaryStats.totalRelations}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Stock Total</p>
            <p className="text-2xl font-bold text-green-600">{summaryStats.totalStock}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Stock Bajo</p>
            <p className="text-2xl font-bold text-yellow-600">{summaryStats.lowStockItems}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Crítico</p>
            <p className="text-2xl font-bold text-orange-600">{summaryStats.criticalStockItems}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Sin Stock</p>
            <p className="text-2xl font-bold text-red-600">{summaryStats.outOfStockItems}</p>
          </div>
        </Card>
      </div>

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por producto, tienda, código..."
            value={filters.search}
            onChange={handleSearchChange}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={storeOptions}
            value={filters.storeId?.toString() || ''}
            onChange={handleSelectChange('storeId')}
          />
          
          <Select
            options={categoryOptions}
            value={filters.categoryId?.toString() || ''}
            onChange={handleSelectChange('categoryId')}
          />

          <Select
            options={stockStatusOptions}
            value={filters.stockStatus}
            onChange={handleSelectChange('stockStatus')}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg text-gray-800 font-bold">
            Stock por Tienda ({filteredProductStores.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredProductStores.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 5v6m6-6v6" />
              </svg>
            }
            title="No hay stock registrado"
            description={
              productStores.length === 0 
                ? "Aún no se han asignado productos a las tiendas."
                : "No se encontraron productos con los filtros aplicados."
            }
            action={{
              text: productStores.length === 0 ? "Ir a gestión de productos" : "Limpiar filtros",
              onClick: productStores.length === 0 ? () => window.location.href = '/products' : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredProductStores}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron registros de stock"
            />
          </div>
        )}
      </Card>

      {/* ProductStore Form Modal Unificado */}
      <ProductStoreForm
        isOpen={showProductStoreForm}
        onClose={handleProductStoreFormClose}
        onSuccess={handleProductStoreFormSuccess}
        editingProductStore={editingProductStoreForm}
      />
    </div>
  );
};