// src/components/inventory/InventoryMovementForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { 
  InventoryMovementRequest, 
  ProductResponse, 
  StoreResponse, 
  ProductBatchResponse,
  MovementType,
  MovementReason 
} from '@/types';
import { inventoryMovementAPI, productAPI, storeAPI, productBatchAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/hooks/useNotification';

interface InventoryMovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  movementType?: MovementType;
}

interface FormErrors {
  [key: string]: string;
}

export const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  movementType = MovementType.OUT,
}) => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

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
    userId: 1, // Will be updated with actual user ID
    notes: '',
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});

  const resetForm = useCallback((): void => {
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
      userId: user ? parseInt(user.id) : 1,
      notes: '',
    });
    setBatches([]);
    setErrors({});
    setError('');
  }, [movementType, user]);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los productos';
      setError(errorMessage);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las tiendas';
      setError(errorMessage);
    }
  }, []);

  const fetchBatchesByProduct = useCallback(async (productId: number): Promise<void> => {
    try {
      // ✅ Usar solo método que SÍ existe: getAllBatches
      const allBatches = await productBatchAPI.getAllBatches();
      const productBatches = allBatches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );
      setBatches(productBatches);
    } catch (err) {
      setBatches([]);
      console.error('Error al cargar lotes del producto:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchStores();
      resetForm();
    }
  }, [isOpen, fetchProducts, fetchStores, resetForm]);

  useEffect(() => {
    if (formData.productId && formData.productId !== 0) {
      fetchBatchesByProduct(formData.productId);
    } else {
      setBatches([]);
    }
  }, [formData.productId, fetchBatchesByProduct]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

    // Validar que hay suficiente stock en el lote seleccionado
    if (formData.batchId && movementType === MovementType.OUT) {
      const selectedBatch = batches.find(b => b.id === formData.batchId);
      if (selectedBatch && formData.quantity > selectedBatch.currentQuantity) {
        newErrors.quantity = `Solo hay ${selectedBatch.currentQuantity} unidades disponibles en este lote`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await inventoryMovementAPI.createMovement(formData);
      success('Movimiento de inventario registrado correctamente');
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar el movimiento de inventario';
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InventoryMovementRequest, value: string | number | undefined): void => {
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
    label: reason.charAt(0).toUpperCase() + reason.slice(1).toLowerCase().replace('_', ' ')
  }));

  const getMovementTitle = (): string => {
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

  const getMovementDescription = (): string => {
    switch (movementType) {
      case MovementType.IN:
        return 'Registra el ingreso de productos al inventario';
      case MovementType.OUT:
        return 'Registra la salida de productos del inventario';
      case MovementType.TRANSFER:
        return 'Transfiere productos entre tiendas';
      default:
        return '';
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
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <p className="text-sm text-blue-700">{getMovementDescription()}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Producto*"
            value={formData.productId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('productId', parseInt(e.target.value) || 0)
            }
            options={productOptions}
            error={errors.productId}
          />

          <Input
            label="Cantidad*"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('quantity', parseInt(e.target.value) || 0)
            }
            error={errors.quantity}
            placeholder="Cantidad a mover"
          />

          {formData.productId !== 0 && batches.length > 0 && (
            <Select
              label="Lote Específico"
              value={formData.batchId?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                handleInputChange('batchId', e.target.value ? parseInt(e.target.value) : undefined)
              }
              options={batchOptions}
              error={errors.batchId}
            />
          )}

          <Select
            label="Motivo*"
            value={formData.reason}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('reason', e.target.value as MovementReason)
            }
            options={reasonOptions}
            error={errors.reason}
          />

          {movementType === MovementType.TRANSFER && (
            <>
              <Select
                label="Tienda Origen*"
                value={formData.fromStoreId?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('fromStoreId', e.target.value ? parseInt(e.target.value) : undefined)
                }
                options={storeOptions}
                error={errors.fromStoreId}
              />

              <Select
                label="Tienda Destino*"
                value={formData.toStoreId?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('toStoreId', e.target.value ? parseInt(e.target.value) : undefined)
                }
                options={storeOptions}
                error={errors.toStoreId}
              />
            </>
          )}

          {(movementType === MovementType.IN || movementType === MovementType.OUT) && (
            <Select
              label={movementType === MovementType.IN ? "Tienda Destino" : "Tienda Origen"}
              value={
                movementType === MovementType.IN 
                  ? formData.toStoreId?.toString() || ''
                  : formData.fromStoreId?.toString() || ''
              }
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const storeId = e.target.value ? parseInt(e.target.value) : undefined;
                if (movementType === MovementType.IN) {
                  handleInputChange('toStoreId', storeId);
                } else {
                  handleInputChange('fromStoreId', storeId);
                }
              }}
              options={[
                { value: '', label: 'Bodega Central' },
                ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
              ]}
            />
          )}

          <div className="md:col-span-2">
            <Input
              label="Notas"
              value={formData.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('notes', e.target.value)
              }
              error={errors.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        {/* Información del lote seleccionado */}
        {formData.batchId && batches.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            {(() => {
              const selectedBatch = batches.find(b => b.id === formData.batchId);
              if (selectedBatch) {
                return (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Información del Lote</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Código:</span> 
                        <span className="font-mono text-gray-600 ml-2">{selectedBatch.batchCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Disponible:</span> 
                        <span className="font-bold ml-2">{selectedBatch.currentQuantity} unidades</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Vencimiento:</span> 
                        <span className="ml-2">{new Date(selectedBatch.expirationDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ubicación:</span> 
                        <span className="ml-2">{selectedBatch.store?.name || 'Bodega Central'}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

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