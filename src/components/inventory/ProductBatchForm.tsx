// src/components/inventory/ProductBatchForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductBatchRequest, ProductBatchResponse, ProductResponse, StoreResponse } from '@/types';
import { productBatchAPI, productAPI, storeAPI } from '@/services/api';

interface ProductBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBatch?: ProductBatchResponse | null;
}

export const ProductBatchForm: React.FC<ProductBatchFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingBatch,
}) => {
  const [formData, setFormData] = useState<ProductBatchRequest>({
    batchCode: '',
    productId: 0,
    productionDate: '',
    expirationDate: '',
    initialQuantity: 0,
    currentQuantity: 0,
    batchCost: 0,
    storeId: undefined,
    isActive: true,
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchStores();
      if (editingBatch) {
        setFormData({
          batchCode: editingBatch.batchCode,
          productId: editingBatch.product.id,
          productionDate: editingBatch.productionDate,
          expirationDate: editingBatch.expirationDate,
          initialQuantity: editingBatch.initialQuantity,
          currentQuantity: editingBatch.currentQuantity,
          batchCost: editingBatch.batchCost,
          storeId: editingBatch.store?.id,
          isActive: editingBatch.isActive,
        });
      } else {
        resetForm();
        generateBatchCode();
      }
    }
  }, [isOpen, editingBatch]);

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

  const generateBatchCode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    setFormData(prev => ({ 
      ...prev, 
      batchCode: `LOTE-${year}${month}${day}-${random}`,
      productionDate: date.toISOString().split('T')[0]
    }));
  };

  const resetForm = () => {
    setFormData({
      batchCode: '',
      productId: 0,
      productionDate: '',
      expirationDate: '',
      initialQuantity: 0,
      currentQuantity: 0,
      batchCost: 0,
      storeId: undefined,
      isActive: true,
    });
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.batchCode.trim()) {
      newErrors.batchCode = 'El código del lote es requerido';
    }

    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    if (!formData.productionDate) {
      newErrors.productionDate = 'La fecha de producción es requerida';
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = 'La fecha de vencimiento es requerida';
    }

    if (formData.productionDate && formData.expirationDate && 
        new Date(formData.expirationDate) <= new Date(formData.productionDate)) {
      newErrors.expirationDate = 'La fecha de vencimiento debe ser posterior a la fecha de producción';
    }

    if (formData.initialQuantity <= 0) {
      newErrors.initialQuantity = 'La cantidad inicial debe ser mayor a 0';
    }

    if (formData.currentQuantity < 0) {
      newErrors.currentQuantity = 'La cantidad actual no puede ser negativa';
    }

    if (formData.currentQuantity > formData.initialQuantity) {
      newErrors.currentQuantity = 'La cantidad actual no puede ser mayor a la cantidad inicial';
    }

    if (formData.batchCost < 0) {
      newErrors.batchCost = 'El costo del lote no puede ser negativo';
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
      // Si no se editando, la cantidad actual es igual a la inicial
      if (!editingBatch) {
        formData.currentQuantity = formData.initialQuantity;
      }

      if (editingBatch) {
        await productBatchAPI.updateBatch(editingBatch.id, formData);
      } else {
        await productBatchAPI.createBatch(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(editingBatch ? 'Error al actualizar el lote' : 'Error al crear el lote');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductBatchRequest, value: string | number | boolean | undefined) => {
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
    { value: '', label: 'Bodega Central (Sin asignar)' },
    ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBatch ? 'Editar Lote de Producción' : 'Registrar Nuevo Lote'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código del Lote"
            value={formData.batchCode}
            onChange={(e) => handleInputChange('batchCode', e.target.value)}
            error={errors.batchCode}
            disabled={!!editingBatch}
            placeholder="LOTE-YYMMDD-XXXX"
          />

          <Select
            label="Producto*"
            value={formData.productId}
            onChange={(e) => handleInputChange('productId', parseInt(e.target.value))}
            options={productOptions}
            error={errors.productId}
          />

          <Input
            label="Fecha de Producción*"
            type="date"
            value={formData.productionDate}
            onChange={(e) => handleInputChange('productionDate', e.target.value)}
            error={errors.productionDate}
          />

          <Input
            label="Fecha de Vencimiento*"
            type="date"
            value={formData.expirationDate}
            onChange={(e) => handleInputChange('expirationDate', e.target.value)}
            error={errors.expirationDate}
          />

          <Input
            label="Cantidad Inicial*"
            type="number"
            value={formData.initialQuantity}
            onChange={(e) => handleInputChange('initialQuantity', parseInt(e.target.value) || 0)}
            error={errors.initialQuantity}
            placeholder="Unidades producidas"
          />

          {editingBatch && (
            <Input
              label="Cantidad Actual"
              type="number"
              value={formData.currentQuantity}
              onChange={(e) => handleInputChange('currentQuantity', parseInt(e.target.value) || 0)}
              error={errors.currentQuantity}
              placeholder="Unidades disponibles"
            />
          )}

          <Input
            label="Costo del Lote ($)*"
            type="number"
            step="0.01"
            value={formData.batchCost}
            onChange={(e) => handleInputChange('batchCost', parseFloat(e.target.value) || 0)}
            error={errors.batchCost}
            placeholder="Costo total de producción"
          />

          <Select
            label="Asignar a Tienda"
            value={formData.storeId?.toString() || ''}
            onChange={(e) => handleInputChange('storeId', e.target.value ? parseInt(e.target.value) : undefined)}
            options={storeOptions}
            error={errors.storeId}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Lote activo
          </label>
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
            {editingBatch ? 'Actualizar' : 'Registrar'} Lote
          </Button>
        </div>
      </form>
    </Modal>
  );
};