// src/components/products/ProductList.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { productAPI, categoryAPI } from '@/services/api';
import { formatters } from '@/utils/formatters';
import {
  ProductResponse,
  CategoryResponse,
  ProductRequest
} from '@/types';

// Local interfaces to avoid conflicts with global types
interface ProductListFilters {
  search: string;
  selectedCategoryId?: number;
  selectedFlavor: string;
  isActiveFilter?: boolean;
}

interface ProductListState {
  products: ProductResponse[];
  categories: CategoryResponse[];
  loading: boolean;
  error: string | null;
  selectedProduct: ProductResponse | null;
  showDeleteModal: boolean;
  deleteLoading: boolean;
}

interface ProductFormData {
  code: string;
  nameProduct: string;
  description: string;
  categoryId: number;
  flavor: string;
  size: string;
  productionCost: number;
  wholesalePrice: number;
  retailPrice: number;
  minStockLevel: number;
  imageUrl: string;
  barcode: string;
  isActive: boolean;
}

interface ProductListProps {
  onProductSelect?: (product: ProductResponse) => void;
  onProductCreate?: () => void;
  onProductEdit?: (product: ProductResponse) => void;
  showActions?: boolean;
  selectable?: boolean;
}

interface ProductRowActions {
  onView: (product: ProductResponse) => void;
  onEdit: (product: ProductResponse) => void;
  onDelete: (product: ProductResponse) => void;
}

// Product Detail Modal Component
interface ProductDetailModalProps {
  product: ProductResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Producto" size="lg">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Código</label>
            <p className="text-gray-900">{product.code}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <p className="text-gray-900">{product.nameProduct}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <p className="text-gray-900">{product.category.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Sabor</label>
            <p className="text-gray-900">{product.flavor || 'N/A'}</p>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <p className="text-gray-900">{product.description}</p>
          </div>
        )}

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Costo de Producción</label>
            <p className="text-gray-900 font-medium">
              {formatters.currency(product.productionCost)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Precio al Por Mayor</label>
            <p className="text-gray-900 font-medium">
              {formatters.currency(product.wholesalePrice)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Precio al Por Menor</label>
            <p className="text-gray-900 font-medium">
              {formatters.currency(product.retailPrice)}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Tamaño</label>
            <p className="text-gray-900">{product.size || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Stock Mínimo</label>
            <p className="text-gray-900">{formatters.number(product.minStockLevel)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Código de Barras</label>
            <p className="text-gray-900">{product.barcode || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <Badge variant={product.isActive ? "success" : "danger"}>
              {product.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Creado: {formatters.dateTime(product.createdAt)}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  product: ProductResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="sm">
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-700">
            ¿Estás seguro de que deseas eliminar el producto
            <span className="font-bold"> "{product.nameProduct}"</span>?
          </p>
          <p className="text-sm text-red-600 mt-2">
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={loading}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Main Component
export const ProductList: React.FC<ProductListProps> = ({
  onProductSelect,
  onProductCreate,
  onProductEdit,
  showActions = true,
  selectable = false
}) => {
  // State
  const [state, setState] = useState<ProductListState>({
    products: [],
    categories: [],
    loading: true,
    error: null,
    selectedProduct: null,
    showDeleteModal: false,
    deleteLoading: false
  });

  const [filters, setFilters] = useState<ProductListFilters>({
    search: '',
    selectedCategoryId: undefined,
    selectedFlavor: '',
    isActiveFilter: undefined
  });

  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);

  // Load data
  const loadData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [productsData, categoriesData] = await Promise.all([
        productAPI.getAllProducts(),
        categoryAPI.getAllCategories()
      ]);

      setState(prev => ({
        ...prev,
        products: productsData,
        categories: categoriesData,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cargar productos',
        loading: false
      }));
    }
  }, []);

  // Filter products
  const filteredProducts = useMemo((): ProductResponse[] => {
    return state.products.filter(product => {
      const matchesSearch = !debouncedSearch || 
        product.nameProduct.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesCategory = !filters.selectedCategoryId || 
        product.category.id === filters.selectedCategoryId;

      const matchesFlavor = !filters.selectedFlavor || 
        (product.flavor && product.flavor.toLowerCase().includes(filters.selectedFlavor.toLowerCase()));

      const matchesActive = filters.isActiveFilter === undefined || 
        product.isActive === filters.isActiveFilter;

      return matchesSearch && matchesCategory && matchesFlavor && matchesActive;
    });
  }, [state.products, debouncedSearch, filters]);

  // Get unique flavors for filter
  const availableFlavors = useMemo((): string[] => {
    const flavors = state.products
      .map(product => product.flavor)
      .filter((flavor): flavor is string => Boolean(flavor))
      .filter((flavor, index, array) => array.indexOf(flavor) === index);
    
    return flavors.sort();
  }, [state.products]);

  // Handlers
  const handleFilterChange = useCallback(<K extends keyof ProductListFilters>(
    key: K,
    value: ProductListFilters[K]
  ): void => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    handleFilterChange('search', event.target.value);
  }, [handleFilterChange]);

  const handleCategoryChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    handleFilterChange('selectedCategoryId', value ? Number(value) : undefined);
  }, [handleFilterChange]);

  const handleFlavorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    handleFilterChange('selectedFlavor', event.target.value);
  }, [handleFilterChange]);

  const handleActiveFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    handleFilterChange('isActiveFilter', value === '' ? undefined : value === 'true');
  }, [handleFilterChange]);

  // Action handlers
  const handleProductView = useCallback((product: ProductResponse): void => {
    setState(prev => ({ ...prev, selectedProduct: product }));
    setShowDetailModal(true);
  }, []);

  const handleProductEdit = useCallback((product: ProductResponse): void => {
    if (onProductEdit) {
      onProductEdit(product);
    }
  }, [onProductEdit]);

  const handleProductDelete = useCallback((product: ProductResponse): void => {
    setState(prev => ({ 
      ...prev, 
      selectedProduct: product,
      showDeleteModal: true 
    }));
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!state.selectedProduct) return;

    setState(prev => ({ ...prev, deleteLoading: true }));

    try {
      await productAPI.deleteProduct(state.selectedProduct.id);
      
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== state.selectedProduct!.id),
        selectedProduct: null,
        showDeleteModal: false,
        deleteLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al eliminar producto',
        deleteLoading: false
      }));
    }
  }, [state.selectedProduct]);

  const handleProductSelect = useCallback((product: ProductResponse): void => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  }, [onProductSelect]);

  // Clear error
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Table columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'code',
        header: 'Código',
        render: (value: string) => (
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {value}
          </span>
        )
      },
      {
        key: 'nameProduct',
        header: 'Nombre',
        render: (value: string, row: ProductResponse) => (
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            {row.flavor && (
              <div className="text-sm text-gray-500">{row.flavor}</div>
            )}
          </div>
        )
      },
      {
        key: 'category',
        header: 'Categoría',
        render: (value: CategoryResponse) => (
          <Badge variant="secondary">{value.name}</Badge>
        )
      },
      {
        key: 'retailPrice',
        header: 'Precio Retail',
        render: (value: number) => (
          <span className="font-medium text-green-600">
            {formatters.currency(value)}
          </span>
        )
      },
      {
        key: 'minStockLevel',
        header: 'Stock Mínimo',
        render: (value: number) => formatters.number(value)
      },
      {
        key: 'isActive',
        header: 'Estado',
        render: (value: boolean) => (
          <Badge variant={value ? "success" : "danger"}>
            {value ? 'Activo' : 'Inactivo'}
          </Badge>
        )
      }
    ];

    if (showActions || selectable) {
      baseColumns.push({
        key: 'actions',
        header: 'Acciones',
        render: (_: unknown, row: ProductResponse) => (
          <div className="flex gap-2">
            {selectable && (
              <Button 
                size="sm" 
                variant="primary" 
                onClick={() => handleProductSelect(row)}
              >
                Seleccionar
              </Button>
            )}
            {showActions && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleProductView(row)}
                >
                  Ver
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleProductEdit(row)}
                >
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="danger" 
                  onClick={() => handleProductDelete(row)}
                >
                  Eliminar
                </Button>
              </>
            )}
          </div>
        )
      });
    }

    return baseColumns;
  }, [showActions, selectable, handleProductSelect, handleProductView, handleProductEdit, handleProductDelete]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
          <p className="text-gray-600">
            Gestiona el catálogo de productos de chocolate
          </p>
        </div>
        {onProductCreate && (
          <Button onClick={onProductCreate}>
            Crear Producto
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Buscar"
            placeholder="Nombre, código o descripción..."
            value={filters.search}
            onChange={handleSearchChange}
          />
          
          <Select
            label="Categoría"
            value={filters.selectedCategoryId?.toString() || ''}
            onChange={handleCategoryChange}
            options={[
              { value: '', label: 'Todas las categorías' },
              ...state.categories.map(category => ({
                value: category.id.toString(),
                label: category.name
              }))
            ]}
          />

          <Input
            label="Sabor"
            placeholder="Filtrar por sabor..."
            value={filters.selectedFlavor}
            onChange={handleFlavorChange}
            list="flavors-list"
          />

          <Select
            label="Estado"
            value={filters.isActiveFilter === undefined ? '' : filters.isActiveFilter.toString()}
            onChange={handleActiveFilterChange}
            options={[
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Activos' },
              { value: 'false', label: 'Inactivos' }
            ]}
          />
        </div>

        {/* Flavors datalist */}
        <datalist id="flavors-list">
          {availableFlavors.map(flavor => (
            <option key={flavor} value={flavor} />
          ))}
        </datalist>
      </Card>

      {/* Error */}
      {state.error && (
        <Alert variant="error" onClose={clearError}>
          {state.error}
        </Alert>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Mostrando {filteredProducts.length} de {state.products.length} productos
        </span>
        <Button variant="outline" onClick={loadData} disabled={state.loading}>
          Actualizar
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <Table
          data={filteredProducts}
          columns={columns}
          loading={state.loading}
          emptyMessage="No se encontraron productos"
        />
      </Card>

      {/* Modals */}
      <ProductDetailModal
        product={state.selectedProduct}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setState(prev => ({ ...prev, selectedProduct: null }));
        }}
      />

      <DeleteConfirmModal
        product={state.selectedProduct}
        isOpen={state.showDeleteModal}
        onClose={() => setState(prev => ({ 
          ...prev, 
          showDeleteModal: false, 
          selectedProduct: null 
        }))}
        onConfirm={confirmDelete}
        loading={state.deleteLoading}
      />
    </div>
  );
};