// src/components/products/ProductList.tsx
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { ProductForm } from './ProductForm';
import { CategoryForm } from './CategoryForm';
import { ProductResponse, CategoryResponse, ProductFilters } from '@/types';
import { productAPI, categoryAPI, ApiError } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; product: ProductResponse | null }>({
    show: false,
    product: null
  });
  
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoryId: undefined,
    flavor: '',
    isActive: undefined,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  const fetchProducts = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los productos';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (): Promise<void> => {
    try {
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const handleDeleteClick = (product: ProductResponse): void => {
    setDeleteConfirm({ show: true, product });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm.product) return;

    try {
      await productAPI.deleteProduct(deleteConfirm.product.id);
      await fetchProducts();
      setDeleteConfirm({ show: false, product: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar el producto. Verifique que no tenga stock asociado.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, product: null });
      console.error('Error deleting product:', err);
    }
  };

  const handleEditProduct = (product: ProductResponse): void => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleProductFormClose = (): void => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleProductFormSuccess = (): void => {
    fetchProducts();
  };

  const handleCategoryFormSuccess = (): void => {
    fetchCategories();
  };

  const handleSearch = useCallback(async (): Promise<void> => {
    if (!filters.search && !filters.categoryId && !filters.flavor && filters.isActive === undefined) {
      fetchProducts();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await productAPI.searchProducts(filters);
      setProducts(data);
    } catch (err) {
      // If search endpoint doesn't exist, fallback to client-side filtering
      if (err instanceof ApiError && err.status === 404) {
        await fetchProducts();
      } else {
        const errorMessage = err instanceof ApiError 
          ? err.message 
          : 'Error al buscar productos';
        setError(errorMessage);
        console.error('Error searching products:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const clearFilters = (): void => {
    setFilters({
      search: '',
      categoryId: undefined,
      flavor: '',
      isActive: undefined,
    });
    fetchProducts();
  };

  const handleRefresh = (): void => {
    fetchProducts();
    fetchCategories();
  };

  // Client-side filtering as fallback
  const filteredProducts = products.filter(product => {
    const matchesSearch = !filters.search || 
      product.nameProduct.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.code.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = !filters.categoryId || product.category.id === filters.categoryId;
    
    const matchesFlavor = !filters.flavor || 
      (product.flavor && product.flavor.toLowerCase().includes(filters.flavor.toLowerCase()));
    
    const matchesStatus = filters.isActive === undefined || product.isActive === filters.isActive;

    return matchesSearch && matchesCategory && matchesFlavor && matchesStatus;
  });

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' },
  ];

  const columns: TableColumn<ProductResponse>[] = [
    {
      key: 'imageUrl',
      header: 'Imagen',
      render: (value: string) => (
        <div className="w-12 h-12 bg-gray-200 border-2 border-black flex items-center justify-center">
          {value ? (
            <img src={value} alt="Producto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">Sin imagen</span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      render: (value: string) => <span className="font-mono text-gray-700 text-sm">{value}</span>,
    },
    {
      key: 'nameProduct',
      header: 'Nombre',
      render: (value: string, row: ProductResponse) => (
        <div>
          <span className="font-medium text-gray-800">{value}</span>
          {row.description && (
            <p className="text-xs text-gray-700 mt-1 truncate" title={row.description}>
              {row.description.length > 50 ? `${row.description.substring(0, 50)}...` : row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'category.name',
      header: 'Categoría',
      render: (value: string) => <Badge variant="secondary" size="sm">{value}</Badge>,
    },
    {
      key: 'flavor',
      header: 'Sabor',
      render: (value: string) => <span className='text-gray-700'> {value || '-' }</span>,
    },
    {
      key: 'size',
      header: 'Tamaño',
      render: (value: string) => <span className='text-gray-700'>{value || '-'}</span>,
    },
    {
      key: 'retailPrice',
      header: 'P. Detalle',
      render: (value: number) => (
        <span className="font-medium text-green-600">
          ${Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'wholesalePrice',
      header: 'P. Mayorista',
      render: (value: number) => (
        <span className="font-medium text-blue-600">
          ${Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'minStockLevel',
      header: 'Stock Mín.',
      render: (value: number) => (
        <Badge variant="secondary" size="sm">{value}</Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'} size="sm">
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: ProductResponse) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditProduct(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Administra el catálogo de productos de Chocorocks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCategoryForm(true)}
            className="w-full sm:w-auto"
          >
            Gestionar Categorías
          </Button>
          <Button 
            onClick={() => setShowProductForm(true)}
            className="w-full sm:w-auto"
          >
            + Nuevo Producto
          </Button>
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
        </div>
      </div>

      {error && (
        <BackendErrorHandler 
          error={error}
          onRetry={handleRefresh}
          title="Error al cargar Productos"
          description="No se pudieron cargar los productos. Verifica la conexión con el backend."
        />
      )}

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por nombre o código..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={categoryOptions}
            value={filters.categoryId?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              categoryId: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
          />
          
          <Input
            placeholder="Filtrar por sabor..."
            value={filters.flavor}
            onChange={(e) => setFilters(prev => ({ ...prev, flavor: e.target.value }))}
          />
          
          <Select
            options={statusOptions}
            value={filters.isActive?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
            }))}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            Limpiar Filtros
          </Button>
          <Button onClick={handleSearch} className="w-full sm:w-auto">
            Buscar
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg text-gray-700 font-bold">
            Productos ({filteredProducts.length})
          </h2>
          {categories.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
              ⚠️ No hay categorías. <button 
                onClick={() => setShowCategoryForm(true)}
                className="underline font-medium hover:text-amber-800"
              >
                Crear una categoría
              </button> primero.
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            title="No hay productos"
            description={
              products.length === 0 
                ? "Aún no has creado ningún producto. ¡Comienza agregando tu primer producto al catálogo!"
                : "No se encontraron productos con los filtros aplicados. Prueba ajustando los criterios de búsqueda."
            }
            action={{
              text: products.length === 0 ? "Crear primer producto" : "Limpiar filtros",
              onClick: products.length === 0 ? () => setShowProductForm(true) : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredProducts}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron productos"
            />
          </div>
        )}
      </Card>

      <ProductForm
        isOpen={showProductForm}
        onClose={handleProductFormClose}
        onSuccess={handleProductFormSuccess}
        editingProduct={editingProduct}
      />

      <CategoryForm
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        onSuccess={handleCategoryFormSuccess}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, product: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar el producto "${deleteConfirm.product?.nameProduct}"? Esta acción no se puede deshacer y solo será posible si no tiene stock asociado.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};