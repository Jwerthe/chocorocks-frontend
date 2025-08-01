// src/components/inventory/ProductBatchForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductBatchRequest, ProductBatchResponse, ProductResponse, StoreResponse } from '@/types';
import { productBatchAPI, productAPI, storeAPI, ApiError } from '@/services/api';
import { useNotification } from '@/hooks/useNotification';
import { validators } from '@/utils/validators';

interface ProductBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBatch?: ProductBatchResponse | null;
}

interface FormErrors {
  [key: string]: string;
}

export const ProductBatchForm: React.FC<ProductBatchFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingBatch,
}) => {
  const { success, error: notifyError } = useNotification();

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
  const [existingBatches, setExistingBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});

  const generateBatchCode = useCallback((): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `LOTE-${year}${month}${day}-${random}`;
  }, []);

  const resetForm = useCallback((): void => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      batchCode: generateBatchCode(),
      productId: 0,
      productionDate: today,
      expirationDate: '',
      initialQuantity: 0,
      currentQuantity: 0,
      batchCost: 0,
      storeId: undefined,
      isActive: true,
    });
    setErrors({});
    setError('');
  }, [generateBatchCode]);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al cargar los productos';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al cargar las tiendas';
      setError(errorMessage);
      console.error('Error fetching stores:', err);
    }
  }, []);

  const fetchExistingBatches = useCallback(async (): Promise<void> => {
    try {
      const data = await productBatchAPI.getAllBatches();
      setExistingBatches(data);
    } catch (err) {
      console.error('Error al cargar lotes existentes:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchStores();
      fetchExistingBatches();
      
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
      }
    }
  }, [isOpen, editingBatch, fetchProducts, fetchStores, fetchExistingBatches, resetForm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validación de código de lote
    if (!validators.required(formData.batchCode)) {
      newErrors.batchCode = 'El código del lote es requerido';
    } else if (!validators.minLength(formData.batchCode.trim(), 3)) {
      newErrors.batchCode = 'El código del lote debe tener al menos 3 caracteres';
    } else if (!validators.maxLength(formData.batchCode.trim(), 50)) {
      newErrors.batchCode = 'El código del lote no puede tener más de 50 caracteres';
    } else if (!editingBatch) {
      // Validar código único solo al crear
      const isDuplicate = existingBatches.some(batch => 
        batch.batchCode.toLowerCase().trim() === formData.batchCode.toLowerCase().trim()
      );
      if (isDuplicate) {
        newErrors.batchCode = 'Este código de lote ya existe. Use uno diferente.';
      }
    }

    // Validación de producto
    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    // Validación de fechas con lógica de negocio
    if (!formData.productionDate) {
      newErrors.productionDate = 'La fecha de producción es requerida';
    } else {
      const productionDate = new Date(formData.productionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (productionDate > today) {
        newErrors.productionDate = 'La fecha de producción no puede ser futura';
      }
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (productionDate < oneYearAgo) {
        newErrors.productionDate = 'La fecha de producción no puede ser mayor a 1 año atrás';
      }
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = 'La fecha de vencimiento es requerida';
    } else if (formData.productionDate) {
      const productionDate = new Date(formData.productionDate);
      const expirationDate = new Date(formData.expirationDate);
      
      if (expirationDate <= productionDate) {
        newErrors.expirationDate = 'La fecha de vencimiento debe ser posterior a la fecha de producción';
      }

      // Verificar que la fecha de vencimiento no sea muy lejana (más de 2 años)
      const twoYearsFromProduction = new Date(productionDate);
      twoYearsFromProduction.setFullYear(twoYearsFromProduction.getFullYear() + 2);
      if (expirationDate > twoYearsFromProduction) {
        newErrors.expirationDate = 'La fecha de vencimiento no puede ser mayor a 2 años desde la producción';
      }

      // Verificar que no haya vencido ya (solo para nuevos lotes)
      const today = new Date();
      if (expirationDate < today && !editingBatch) {
        newErrors.expirationDate = 'No se pueden crear lotes que ya hayan vencido';
      }
    }

    // Validación de cantidades con lógica de negocio
    if (formData.initialQuantity <= 0) {
      newErrors.initialQuantity = 'La cantidad inicial debe ser mayor a 0';
    } else if (formData.initialQuantity > 10000) {
      newErrors.initialQuantity = 'La cantidad inicial no puede ser mayor a 10,000';
    } else if (!Number.isInteger(formData.initialQuantity)) {
      newErrors.initialQuantity = 'La cantidad inicial debe ser un número entero';
    }

    if (formData.currentQuantity < 0) {
      newErrors.currentQuantity = 'La cantidad actual no puede ser negativa';
    } else if (formData.currentQuantity > formData.initialQuantity) {
      newErrors.currentQuantity = 'La cantidad actual no puede ser mayor a la cantidad inicial';
    } else if (!Number.isInteger(formData.currentQuantity)) {
      newErrors.currentQuantity = 'La cantidad actual debe ser un número entero';
    }

    // Validación de costo con lógica de negocio
    if (formData.batchCost < 0) {
      newErrors.batchCost = 'El costo del lote no puede ser negativo';
    } else if (formData.batchCost > 100000) {
      newErrors.batchCost = 'El costo del lote no puede ser mayor a $100,000';
    } else if (formData.initialQuantity > 0 && formData.batchCost > 0) {
      const costPerUnit = formData.batchCost / formData.initialQuantity;
      if (costPerUnit > 1000) {
        newErrors.batchCost = `El costo por unidad parece muy alto ($${costPerUnit.toFixed(2)}). Verifique el costo total.`;
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
      // Si no se está editando, la cantidad actual es igual a la inicial
      const submitData = { ...formData };
      if (!editingBatch) {
        submitData.currentQuantity = submitData.initialQuantity;
      }

      if (editingBatch) {
        await productBatchAPI.updateBatch(editingBatch.id, submitData);
        success('Lote actualizado correctamente');
      } else {
        await productBatchAPI.createBatch(submitData);
        success('Lote creado correctamente');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 
        (editingBatch ? 'Error al actualizar el lote' : 'Error al crear el lote');
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductBatchRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const productId = parseInt(e.target.value) || 0;
    handleInputChange('productId', productId);
    
    // Auto-calcular fecha de vencimiento si se selecciona un producto
    if (productId && formData.productionDate && !editingBatch) {
      const productionDate = new Date(formData.productionDate);
      const expirationDate = new Date(productionDate);
      expirationDate.setMonth(expirationDate.getMonth() + 6); // 6 meses por defecto
      setFormData(prev => ({ 
        ...prev, 
        productId,
        expirationDate: expirationDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleProductionDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const productionDate = e.target.value;
    handleInputChange('productionDate', productionDate);
    
    // Auto-calcular fecha de vencimiento solo si no está editando y no hay fecha ya establecida
    if (productionDate && !editingBatch && !formData.expirationDate) {
      const prodDate = new Date(productionDate);
      const expDate = new Date(prodDate);
      expDate.setMonth(expDate.getMonth() + 6); // 6 meses por defecto
      setFormData(prev => ({ 
        ...prev, 
        expirationDate: expDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value) || 0;
    handleInputChange('initialQuantity', value);
    // Si no está editando, la cantidad actual es igual a la inicial
    if (!editingBatch) {
      handleInputChange('currentQuantity', value);
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

  // Calculate cost per unit
  const costPerUnit = formData.initialQuantity > 0 ? (formData.batchCost / formData.initialQuantity) : 0;
  const soldUnits = formData.initialQuantity - formData.currentQuantity;
  const remainingValue = formData.currentQuantity > 0 ? (formData.batchCost * (formData.currentQuantity / formData.initialQuantity)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBatch ? 'Editar Lote de Producción' : 'Registrar Nuevo Lote'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código del Lote*"
            value={formData.batchCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('batchCode', e.target.value)
            }
            error={errors.batchCode}
            disabled={!!editingBatch}
            placeholder="LOTE-YYMMDD-XXXX"
            maxLength={50}
          />

          <Select
            label="Producto*"
            value={formData.productId}
            onChange={handleProductChange}
            options={productOptions}
            error={errors.productId}
            disabled={!!editingBatch}
          />

          <Input
            label="Fecha de Producción*"
            type="date"
            value={formData.productionDate}
            onChange={handleProductionDateChange}
            error={errors.productionDate}
            max={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Fecha de Vencimiento*"
            type="date"
            value={formData.expirationDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('expirationDate', e.target.value)
            }
            error={errors.expirationDate}
            min={formData.productionDate || new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Cantidad Inicial*"
            type="number"
            min="1"
            max="10000"
            step="1"
            value={formData.initialQuantity}
            onChange={handleQuantityChange}
            error={errors.initialQuantity}
            placeholder="Unidades producidas"
          />

          {editingBatch && (
            <Input
              label="Cantidad Actual*"
              type="number"
              min="0"
              max={formData.initialQuantity}
              step="1"
              value={formData.currentQuantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('currentQuantity', parseInt(e.target.value) || 0)
              }
              error={errors.currentQuantity}
              placeholder="Unidades disponibles"
            />
          )}

          <Input
            label="Costo del Lote ($)*"
            type="number"
            step="0.01"
            min="0"
            max="100000"
            value={formData.batchCost}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('batchCost', parseFloat(e.target.value) || 0)
            }
            error={errors.batchCost}
            placeholder="Costo total de producción"
          />

          <Select
            label="Asignar a Tienda"
            value={formData.storeId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('storeId', e.target.value ? parseInt(e.target.value) : undefined)
            }
            options={storeOptions}
            error={errors.storeId}
          />
        </div>

        {/* Información calculada */}
        {formData.initialQuantity > 0 && formData.batchCost > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Información Calculada</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
              <div>
                <span className="text-blue-600">Costo por unidad:</span> 
                <div className="font-bold">${costPerUnit.toFixed(4)}</div>
              </div>
              {editingBatch && (
                <>
                  <div>
                    <span className="text-blue-600">Unidades vendidas:</span> 
                    <div className="font-bold">{soldUnits}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">Valor restante:</span> 
                    <div className="font-bold">${remainingValue.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">% Vendido:</span> 
                    <div className="font-bold">{((soldUnits / formData.initialQuantity) * 100).toFixed(1)}%</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('isActive', e.target.checked)
            }
            className="w-4 h-4 text-[#7ca1eb] border-2 border-black rounded focus:ring-[#7ca1eb]"
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
            disabled={loading}
          >
            {editingBatch ? 'Actualizar' : 'Registrar'} Lote
          </Button>
        </div>
      </form>
    </Modal>
  );
};