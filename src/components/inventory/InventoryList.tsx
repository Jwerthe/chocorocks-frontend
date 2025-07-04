// src/components/inventory/InventoryList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ProductBatchForm } from './ProductBatchForm';
import { InventoryMovementForm } from './InventoryMovementForm';
import { 
  ProductBatchResponse, 
  StoreResponse, 
  ProductResponse,
  MovementType,
  InventoryFilters 
} from '@/types';
import { productBatchAPI, storeAPI, productAPI } from '@/services/api';

export const InventoryList: React.FC = () => {
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>(MovementType.IN);
  const [editingBatch, setEditingBatch] = useState<ProductBatchResponse | null>(null);
  
  const [filters, setFilters] = useState({
    storeId: '',
    productId: '',
    showExpiring: false,
    showLowStock: false,
  });

  useEffect(() => {
    fetchBatches();
    fetchStores();
    fetchProducts();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const data = await productBatchAPI.getAllBatches();
      setBatches(data);
      setError('');
    } catch (err) {
      setError('Error al cargar los lotes de inventario');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      console.error('Error al cargar tiendas:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  const handleDeleteBatch = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este lote?')) {
      return;
    }

    try {
      await productBatchAPI.deleteBatch(id);
      fetchBatches();
    } catch (err) {
      setError('Error al eliminar el lote');
    }
  };

  const handleEditBatch = (batch: ProductBatchResponse) => {
    setEditingBatch(batch);
    setShowBatchForm(true);
  };

  const handleBatchFormClose = () => {
    setShowBatchForm(false);
    setEditingBatch(null);
  };

  const handleBatchFormSuccess = () => {
    fetchBatches();
  };

  const handleMovementFormSuccess = () => {
    fetchBatches(); // Refresh to see updated quantities
  };

  const openMovementForm = (type: MovementType) => {
    setMovementType(type);
    setShowMovementForm(true);
  };

  const clearFilters = () => {
    setFilters({
      storeId: '',
      productId: '',
      showExpiring: false,
      showLowStock: false,
    });
  };

  const filteredBatches = batches.filter(batch => {
    const matchesStore = !filters.storeId || batch.store?.id.toString() === filters.storeId;
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

  const getExpirationStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { status: 'Vencido', variant: 'danger' as const };
    } else if (daysUntilExpiration <= 7) {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'danger' as const };
    } else if (daysUntilExpiration <= 30) {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'warning' as const };
    } else {
      return { status: `Vence en ${daysUntilExpiration} días`, variant: 'success' as const };
    }
  };

  const getStockStatus = (batch: ProductBatchResponse) => {
    if (batch.currentQuantity === 0) {
      return { status: 'Sin stock', variant: 'danger' as const };
    } else if (batch.currentQuantity <= batch.product.minStockLevel) {
      return { status: 'Stock bajo', variant: 'warning' as const };
    } else {
      return { status: 'Stock normal', variant: 'success' as const };
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
      key: 'store',
      header: 'Ubicación',
      render: (value: any) => (
        <Badge variant="secondary">
          {value ? value.name : 'Bodega Central'}
        </Badge>
      ),
    },
    {
      key: 'productionDate',
      header: 'Fecha de Producción',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'expirationDate',
      header: 'Vencimiento',
      render: (value: string) => {
        const { status, variant } = getExpirationStatus(value);
        return (
          <div>
            <div>{new Date(value).toLocaleDateString()}</div>
            <Badge variant={variant} size="sm">{status}</Badge>
          </div>
        );
      },
    },
    {
      key: 'quantities',
      header: 'Cantidades',
      render: (_: any, row: ProductBatchResponse) => (
        <div className="text-sm">
          <div><strong>Actual:</strong> {row.currentQuantity}</div>
          <div><strong>Inicial:</strong> {row.initialQuantity}</div>
          <div><strong>Vendido:</strong> {row.initialQuantity - row.currentQuantity}</div>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Estado Stock',
      render: (_: any, row: ProductBatchResponse) => {
        const { status, variant } = getStockStatus(row);
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      key: 'batchCost',
      header: 'Costo Lote',
      render: (value: number) => `$${value.toFixed(2)}`,
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
      render: (_: any, row: ProductBatchResponse) => (
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
            onClick={() => handleDeleteBatch(row.id)}
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

      {error && <Alert variant="error">{error}</Alert>}

      <Card title="Filtros de Inventario">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Tienda/Ubicación"
            options={storeOptions}
            value={filters.storeId}
            onChange={(e) => setFilters(prev => ({ ...prev, storeId: e.target.value }))}
          />
          
          <Select
            label="Producto"
            options={productOptions}
            value={filters.productId}
            onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value }))}
          />

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Filtros Especiales</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showExpiring}
                  onChange={(e) => setFilters(prev => ({ ...prev, showExpiring: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Próximos a vencer (30 días)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showLowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, showLowStock: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Stock bajo</span>
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
          <h2 className="text-lg font-bold">
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
    </div>
  );
};