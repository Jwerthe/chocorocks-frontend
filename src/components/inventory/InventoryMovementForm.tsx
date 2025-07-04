// src/components/inventory/InventoryMovementForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { 
  InventoryMovementRequest, 
  InventoryMovementResponse,
  ProductResponse, 
  StoreResponse, 
  ProductBatchResponse,
  MovementType,
  MovementReason 
} from '@/types';
import { inventoryMovementAPI, productAPI, storeAPI, productBatchAPI } from '@/services/api';

interface InventoryMovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  movementType?: MovementType;
}

export const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  movementType = MovementType.OUT,
}) => {
  const [formData, setFormData] = useState<InventoryMovementRequest>({
    movementType: movementType,
    productId: 0,
    batchId: undefined,
    fromStoreId: undefined,
    toStoreId: undefined,
    quantity: 0,
    reason: MovementReason.SALE,
    referenceId: undefined,
    referenceType: undefined,
    userId: 1, // TODO: Get from auth context
    notes: '',
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchStores();
      setFormData(prev => ({ ...prev, movementType }));
    }
  }, [isOpen, movementType]);

  useEffect(() => {
    if (formData.productId) {
      fetchBatchesByProduct(formData.productId);
    }
  }, [formData.productId]);

  const fetchProducts = async () => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      setError('Error al cargar los productos');
    }
  };

  const fetchStores = async () => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      setError('Error al cargar las tiendas');
    }
  };

  const fetchBatchesByProduct = async (productId: number) => {
    try {
      const data = await productBatchAPI.getBatchesByProduct(productId);
      setBatches(data.filter(b => b.isActive && b.currentQuantity > 0));
    } catch (err) {
      setBatches([]);
    }
  };

  const resetForm = () => {
    setFormData({
      movementType: movementType,
      productId: 0,
      batchId: undefined,
      fromStoreId: undefined,
      toStoreId: undefined,
      quantity: 0,
      reason: MovementReason.SALE,
      referenceId: undefined,
      referenceType: undefined,
      userId: 1,
      notes: '',
    });
    setBatches([]);
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    if (formData.movementType === MovementType.TRANSFER) {
      if (!formData.fromStoreId) {
        newErrors.fromStoreId = 'La tienda origen es requerida para transferencias';
      }
      if (!formData.toStoreId) {
        newErrors.toStoreId = 'La tienda destino es requerida para transferencias';
      }
      if (formData.fromStoreId === formData.toStoreId) {
        newErrors.toStoreId = 'La tienda destino debe ser diferente a la tienda origen';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await inventoryMovementAPI.createMovement(formData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError('Error al registrar el movimiento de inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InventoryMovementRequest, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const productOptions = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map(product => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (${product.size || 'Sin tamaño'})` 
    }))
  ];

  const storeOptions = [
    { value: '', label: 'Seleccionar tienda...' },
    ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
  ];

  const batchOptions = [
    { value: '', label: 'Sin lote específico' },
    ...batches.map(batch => ({ 
      value: batch.id.toString(), 
      label: `${batch.batchCode} (Disponible: ${batch.currentQuantity})` 
    }))
  ];

  const reasonOptions = Object.values(MovementReason).map(reason => ({
    value: reason,
    label: reason.charAt(0).toUpperCase() + reason.slice(1).toLowerCase()
  }));

  const getMovementTitle = () => {
    switch (movementType) {
      case MovementType.IN:
        return 'Registrar Entrada de Inventario';
      case MovementType.OUT:
        return 'Registrar Salida de Inventario';
      case MovementType.TRANSFER:
        return 'Registrar Transferencia';
      default:
        return 'Registrar Movimiento';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getMovementTitle()}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Producto*"
            value={formData.productId}
            onChange={(e) => handleInputChange('productId', parseInt(e.target.value))}
            options={productOptions}
            error={errors.productId}
          />

          <Input
            label="Cantidad*"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
            error={errors.quantity}
            placeholder="Cantidad a mover"
          />

          <Select
            label="Lote (Opcional)"
            value={formData.batchId?.toString() || ''}
            onChange={(e) => handleInputChange('batchId', e.target.value ? parseInt(e.target.value) : undefined)}
            options={batchOptions}
            error={errors.batchId}
          />

          <Select
            label="Motivo*"
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value as MovementReason)}
            options={reasonOptions}
            error={errors.reason}
          />

          {movementType === MovementType.TRANSFER && (
            <>
              <Select
                label="Tienda Origen*"
                value={formData.fromStoreId?.toString() || ''}
                onChange={(e) => handleInputChange('fromStoreId', e.target.value ? parseInt(e.target.value) : undefined)}
                options={storeOptions}
                error={errors.fromStoreId}
              />

              <Select
                label="Tienda Destino*"
                value={formData.toStoreId?.toString() || ''}
                onChange={(e) => handleInputChange('toStoreId', e.target.value ? parseInt(e.target.value) : undefined)}
                options={storeOptions}
                error={errors.toStoreId}
              />
            </>
          )}

          {(movementType === MovementType.IN || movementType === MovementType.OUT) && (
            <Select
              label="Tienda"
              value={formData.toStoreId?.toString() || formData.fromStoreId?.toString() || ''}
              onChange={(e) => {
                const storeId = e.target.value ? parseInt(e.target.value) : undefined;
                if (movementType === MovementType.IN) {
                  handleInputChange('toStoreId', storeId);
                } else {
                  handleInputChange('fromStoreId', storeId);
                }
              }}
              options={storeOptions}
            />
          )}

          <div className="md:col-span-2">
            <Input
              label="Notas"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              error={errors.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            Registrar Movimiento
          </Button>
        </div>
      </form>
    </Modal>
  );
};