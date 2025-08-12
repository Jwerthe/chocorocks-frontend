// src/components/inventory/InventoryList.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { ProductBatchForm } from './ProductBatchForm';
import { InventoryMovementForm } from './InventoryMovementForm';
import { 
  ProductBatchResponse, 
  StoreResponse, 
  ProductResponse,
  MovementType,
  BatchFilters,
} from '@/types';
import { productBatchAPI, storeAPI, productAPI, ApiError } from '@/services/api';
import { useNotification } from '@/hooks/useNotification';

export const InventoryList: React.FC = () => {
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const [showBatchForm, setShowBatchForm] = useState<boolean>(false);
  const [showMovementForm, setShowMovementForm] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<MovementType>(MovementType.IN);
  const [editingBatch, setEditingBatch] = useState<ProductBatchResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; batch: ProductBatchResponse | null }>({
    show: false,
    batch: null
  });
  
  const [filters, setFilters] = useState<BatchFilters>({
    storeId: '',
    productId: '',
    showExpiring: false,
    showLowStock: false,
  });

  const { success, error: notifyError } = useNotification();

  const fetchBatches = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await productBatchAPI.getAllBatches();
      setBatches(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los lotes de inventario';
      setError(errorMessage);
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      console.error('Error al cargar tiendas:', err);
    }
  }, []);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchStores();
    fetchProducts();
  }, [fetchBatches, fetchStores, fetchProducts]);

  const handleDeleteBatch = (batch: ProductBatchResponse): void => {
    setDeleteConfirm({ show: true, batch });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm.batch) return;

    try {
      setLoading(true);
      await productBatchAPI.deleteBatch(deleteConfirm.batch.id);
      await fetchBatches();
      success('Lote eliminado correctamente');
      setDeleteConfirm({ show: false, batch: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar el lote. Verifique que no tenga movimientos asociados.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, batch: null });
      console.error('Error deleting batch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBatch = (batch: ProductBatchResponse): void => {
    setEditingBatch(batch);
    setShowBatchForm(true);
  };

  const handleBatchFormClose = (): void => {
    setShowBatchForm(false);
    setEditingBatch(null);
  };

  const handleBatchFormSuccess = (): void => {
    fetchBatches();
    success(editingBatch ? 'Lote actualizado correctamente' : 'Lote creado correctamente');
  };

  const handleMovementFormSuccess = (): void => {
    fetchBatches(); // Refresh to see updated quantities
    success('Movimiento registrado correctamente');
  };

  const openMovementForm = (type: MovementType): void => {
    setMovementType(type);
    setShowMovementForm(true);
  };

  const clearFilters = (): void => {
    setFilters({
      storeId: '',
      productId: '',
      showExpiring: false,
      showLowStock: false,
    });
  };

  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!isValidDate(dateString)) return 'Fecha inválida';
    
    try {
      const date = new Date(dateString!);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // meses base 0
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return 'Fecha inválida';
    }
  };


  const handleFilterChange = (field: keyof BatchFilters, value: string | boolean): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredBatches = batches.filter(batch => {
    const matchesStore = !filters.storeId || 
      (filters.storeId === 'null' ? !batch.store : batch.store?.id.toString() === filters.storeId);
    const matchesProduct = !filters.productId || batch.product.id.toString() === filters.productId;
    
    const isExpiringSoon = filters.showExpiring && 
      new Date(batch.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const isLowStock = filters.showLowStock && 
      batch.currentQuantity <= batch.product.minStockLevel;

    if (filters.showExpiring && filters.showLowStock) {
      return matchesStore && matchesProduct && (isExpiringSoon || isLowStock);
    } else if (filters.showExpiring) {
      return matchesStore && matchesProduct && isExpiringSoon;
    } else if (filters.showLowStock) {
      return matchesStore && matchesProduct && isLowStock;
    }

    return matchesStore && matchesProduct;
  });

  const getExpirationStatus = (expirationDate: string): { status: string; variant: 'success' | 'warning' | 'danger' } => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { status: 'Vencido', variant: 'danger' };
    } else if (daysUntilExpiration <= 7) {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'danger' };
    } else if (daysUntilExpiration <= 30) {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'warning' };
    } else {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'success' };
    }
  };

  const getStockStatus = (batch: ProductBatchResponse): { status: string; variant: 'success' | 'warning' | 'danger' } => {
    if (batch.currentQuantity === 0) {
      return { status: 'Sin stock', variant: 'danger' };
    } else if (batch.currentQuantity <= batch.product.minStockLevel) {
      return { status: 'Stock bajo', variant: 'warning' };
    } else {
      return { status: 'Stock normal', variant: 'success' };
    }
  };

  const storeOptions = [
    { value: '', label: 'Todas las tiendas' },
    { value: 'null', label: 'Bodega Central' },
    ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
  ];

  const productOptions = [
    { value: '', label: 'Todos los productos' },
    ...products.map(product => ({ 
      value: product.id.toString(), 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'}` 
    }))
  ];

  const columns = [
    {
      key: 'batchCode',
      header: 'Código de Lote',
      render: (value: string) => <span className="font-mono text-sm font-bold text-gray-700">{value}</span>,
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string, row: ProductBatchResponse) => (
        <div>
          <div className="font-medium text-gray-800">{value}</div>
          <div className="text-sm text-gray-800">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Ubicación',
      render: (value: StoreResponse | null | undefined) => (
        <Badge variant="secondary">
          {value ? value.name : 'Bodega Central'}
        </Badge>
      ),
    },
    {
      key: 'productionDate',
      header: 'Fecha de Producción',
      render: (value: string) => (
        <span className='text-gray-700'>{formatDisplayDate(value)}</span>
      ),
    },
    {
      key: 'expirationDate',
      header: 'Vencimiento',
      render: (value: string) => {
        const { status, variant } = getExpirationStatus(value);
        return (
          <div>
            <div className='text-gray-700'>{formatDisplayDate(value)}</div>
            <Badge variant={variant} size="sm">{status}</Badge>
          </div>
        );
      },
    },
    {
      key: 'quantities',
      header: 'Cantidades',
      render: (_: unknown, row: ProductBatchResponse) => (
        <div className="text-sm text-gray-700">
          <div><strong>Actual:</strong> {row.currentQuantity}</div>
          <div><strong>Inicial:</strong> {row.initialQuantity}</div>
          <div><strong>Vendido:</strong> {row.initialQuantity - row.currentQuantity}</div>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Estado Stock',
      render: (_: unknown, row: ProductBatchResponse) => {
        const { status, variant } = getStockStatus(row);
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      key: 'batchCost',
      header: 'Costo Lote',
      render: (value: number) => <span className='text-gray-700'>${value.toFixed(2)}</span>,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: unknown, row: ProductBatchResponse) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditBatch(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteBatch(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-gray-600 mt-1">Control de lotes, stock y movimientos de inventario</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="success"
            onClick={() => openMovementForm(MovementType.IN)}
          >
            + Entrada
          </Button>
          <Button
            variant="danger"
            onClick={() => openMovementForm(MovementType.OUT)}
          >
            - Salida
          </Button>
          <Button
            variant="outline"
            onClick={() => openMovementForm(MovementType.TRANSFER)}
          >
            ↔ Transferir
          </Button>
          <Button onClick={() => setShowBatchForm(true)}>
            + Nuevo Lote
          </Button>
        </div>
      </div>

      {error && (
        <BackendErrorHandler 
          error={error}
          onRetry={fetchBatches}
          title="Error al cargar Lotes"
          description="No se pudieron cargar los lotes de inventario. Verifica la conexión con el backend."
        />
      )}

      <Card title="Filtros de Inventario">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Tienda/Ubicación"
            options={storeOptions}
            value={filters.storeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleFilterChange('storeId', e.target.value)
            }
          />
          
          <Select
            label="Producto"
            options={productOptions}
            value={filters.productId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleFilterChange('productId', e.target.value)
            }
          />

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Filtros Especiales</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showExpiring}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleFilterChange('showExpiring', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Próximos a vencer (30 días)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showLowStock}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleFilterChange('showLowStock', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Stock bajo</span>
              </label>
            </div>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg text-gray-700 font-bold">
            Lotes de Inventario ({filteredBatches.length})
          </h2>
          <div className="text-sm text-gray-600">
            <span className="mr-4">
              <strong>Total en stock:</strong> {filteredBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0)} unidades
            </span>
            <span>
              <strong>Valor total:</strong> ${filteredBatches.reduce((sum, batch) => sum + (batch.batchCost * (batch.currentQuantity / batch.initialQuantity)), 0).toFixed(2)}
            </span>
          </div>
        </div>
        
        <Table
          data={filteredBatches}
          columns={columns}
          loading={loading}
          emptyMessage="No se encontraron lotes de inventario"
        />
      </Card>

      <ProductBatchForm
        isOpen={showBatchForm}
        onClose={handleBatchFormClose}
        onSuccess={handleBatchFormSuccess}
        editingBatch={editingBatch}
      />

      <InventoryMovementForm
        isOpen={showMovementForm}
        onClose={() => setShowMovementForm(false)}
        onSuccess={handleMovementFormSuccess}
        movementType={movementType}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, batch: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Lote"
        message={`¿Estás seguro de que deseas eliminar el lote "${deleteConfirm.batch?.batchCode}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};