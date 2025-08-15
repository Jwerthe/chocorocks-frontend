// src/components/inventory/ProductBatchForm.tsx (CORREGIDO)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductBatchRequest, ProductBatchResponse, ProductResponse, StoreResponse } from '@/types';
import { productBatchAPI, productAPI, storeAPI, productStoreAPI, ApiError } from '@/services/api';
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
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [existingBatches, setExistingBatches] = useState<ProductBatchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

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
    setStockWarnings([]);
    setSelectedProduct(null);
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

  // ✅ NUEVA FUNCIÓN: Actualizar stock del producto
  const updateProductStock = async (
    productId: number, 
    quantity: number, 
    operation: 'subtract' | 'add'
  ): Promise<void> => {
    try {
      const product = await productAPI.getProductById(productId);
      // ✅ CORREGIDO: minStockLevel es el stock actual según la API
      const currentStock = product.minStockLevel || 0;
      
      let newStock: number;
      if (operation === 'subtract') {
        newStock = Math.max(0, currentStock - quantity);
      } else {
        newStock = currentStock + quantity;
      }

      console.log(`📦 Actualizando stock del producto ${productId}: ${currentStock} → ${newStock}`);

      // Actualizar el producto con el nuevo stock
      const updateData = {
        code: product.code,
        nameProduct: product.nameProduct,
        description: product.description || '',
        categoryId: product.category.id,
        flavor: product.flavor || '',
        size: product.size || '',
        productionCost: product.productionCost,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice,
        minStockLevel: newStock, // ✅ ACTUALIZAR: Este es el stock actual
        imageUrl: product.imageUrl || '',
        barcode: product.barcode || '',
        isActive: product.isActive
      };

      await productAPI.updateProduct(productId, updateData);
    } catch (err) {
      console.error('Error updating product stock:', err);
      throw new Error('Error al actualizar el stock del producto');
    }
  };

  // ✅ NUEVA FUNCIÓN: Actualizar relación producto-tienda
  const updateProductStoreRelation = async (
    productId: number,
    storeId: number,
    quantity: number
  ): Promise<void> => {
    try {
      const allProductStores = await productStoreAPI.getAllProductStores();
      const existingRelation = allProductStores.find(ps => 
        ps.product.id === productId && ps.store.id === storeId
      );

      if (existingRelation) {
        // Actualizar relación existente
        const updateData = {
          productId: productId,
          storeId: storeId,
          currentStock: existingRelation.currentStock + quantity,
          minStockLevel: existingRelation.minStockLevel
        };
        await productStoreAPI.updateProductStore(existingRelation.id, updateData);
        console.log(`🏪 Actualizada relación producto-tienda: +${quantity} unidades`);
      } else {
        // Crear nueva relación
        const newRelation = {
          productId: productId,
          storeId: storeId,
          currentStock: quantity,
          minStockLevel: 5 // Valor por defecto
        };
        await productStoreAPI.createProductStore(newRelation);
        console.log(`🏪 Creada nueva relación producto-tienda: ${quantity} unidades`);
      }
    } catch (err) {
      console.error('Error updating product-store relation:', err);
      throw new Error('Error al actualizar la relación producto-tienda');
    }
  };

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
        // Cargar información del producto
        productAPI.getProductById(editingBatch.product.id).then(setSelectedProduct);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingBatch, fetchProducts, fetchStores, fetchExistingBatches, resetForm]);

  // ✅ VALIDACIÓN CORREGIDA: Verificar stock disponible del producto
  const validateStockAvailability = (): boolean => {
    if (!selectedProduct || !formData.initialQuantity || editingBatch) {
      return true; // No validar si no hay producto seleccionado o si está editando
    }
    
    const warnings: string[] = [];
    // ✅ CORREGIDO: minStockLevel es el stock actual
    const currentStock = selectedProduct.minStockLevel || 0;
    
    console.log(`🔍 Validando stock: Producto tiene ${currentStock}, lote requiere ${formData.initialQuantity}`);
    
    if (formData.initialQuantity > currentStock) {
      warnings.push(`❌ Stock insuficiente. Disponible: ${currentStock}, requerido: ${formData.initialQuantity}`);
    } else {
      const remainingStock = currentStock - formData.initialQuantity;
      if (remainingStock < 10) {
        warnings.push(`⚠️ El stock quedará bajo después de crear el lote: ${remainingStock} unidades`);
      }
      if (remainingStock === 0) {
        warnings.push(`⚠️ El stock quedará en 0 después de crear el lote`);
      }
    }

    setStockWarnings(warnings);
    
    // Solo permitir si hay stock suficiente
    return formData.initialQuantity <= currentStock;
  };

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

    // Validación de fechas
    if (!formData.productionDate) {
      newErrors.productionDate = 'La fecha de producción es requerida';
    } else {
      const productionDate = new Date(formData.productionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (productionDate > today) {
        newErrors.productionDate = 'La fecha de producción no puede ser futura';
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

      // Verificar que no haya vencido ya (solo para nuevos lotes)
      const today = new Date();
      if (expirationDate < today && !editingBatch) {
        newErrors.expirationDate = 'No se pueden crear lotes que ya hayan vencido';
      }
    }

    // Validación de cantidades
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
    }

    // ✅ VALIDACIÓN CRÍTICA: Stock disponible
    if (!editingBatch && !validateStockAvailability()) {
      newErrors.initialQuantity = 'Stock insuficiente para crear este lote';
    }

    // Validación de costo
    if (formData.batchCost < 0) {
      newErrors.batchCost = 'El costo del lote no puede ser negativo';
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
      const submitData = { ...formData };
      if (!editingBatch) {
        submitData.currentQuantity = submitData.initialQuantity;
      }

      if (editingBatch) {
        await productBatchAPI.updateBatch(editingBatch.id, submitData);
        success('Lote actualizado correctamente');
      } else {
        // ✅ CREAR NUEVO LOTE CON ACTUALIZACIONES DE STOCK
        console.log('🔄 Creando nuevo lote...');
        
        // 1. Crear el lote
        await productBatchAPI.createBatch(submitData);
        console.log('✅ Lote creado exitosamente');
        
        // 2. Actualizar stock del producto (restar la cantidad del lote)
        await updateProductStock(formData.productId, formData.initialQuantity, 'subtract');
        console.log('✅ Stock del producto actualizado');
        
        // 3. Si se asigna a una tienda, actualizar ProductStore
        if (formData.storeId) {
          await updateProductStoreRelation(formData.productId, formData.storeId, formData.initialQuantity);
          console.log('✅ Relación producto-tienda actualizada');
        }
        
        success('Lote creado correctamente y stock actualizado');
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

  const handleProductChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const productId = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, productId }));
    
    if (productId !== 0) {
      try {
        const product = await productAPI.getProductById(productId);
        setSelectedProduct(product);
        console.log(`📦 Producto seleccionado: ${product.nameProduct}, Stock: ${product.minStockLevel}`);
      } catch (err) {
        setSelectedProduct(null);
        console.error('Error fetching product details:', err);
      }
    } else {
      setSelectedProduct(null);
    }
  };

  const handleInputChange = (field: keyof ProductBatchRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

  // Validar cuando cambie la cantidad o el producto
  useEffect(() => {
    if (selectedProduct && formData.initialQuantity > 0 && !editingBatch) {
      validateStockAvailability();
    } else {
      setStockWarnings([]);
    }
  }, [selectedProduct, formData.initialQuantity, editingBatch]);

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const productOptions = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map(product => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (Stock: ${product.minStockLevel || 0})` 
    }))
  ];

  const storeOptions = [
    { value: '', label: 'Sin asignar' },
    ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
  ];

  // Calculate cost per unit
  const costPerUnit = formData.initialQuantity > 0 ? (formData.batchCost / formData.initialQuantity) : 0;
  const soldUnits = formData.initialQuantity - formData.currentQuantity;
  const remainingValue = formData.currentQuantity > 0 ? (formData.batchCost * (formData.currentQuantity / formData.initialQuantity)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingBatch ? 'Editar Lote de Producción' : 'Registrar Nuevo Lote'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
        
        {/* ✅ ALERTAS DE STOCK MEJORADAS */}
        {stockWarnings.length > 0 && (
          <Alert variant={stockWarnings.some(w => w.includes('❌')) ? 'error' : 'warning'}>
            <div className="space-y-1">
              {stockWarnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </Alert>
        )}

        {/* ✅ INFORMACIÓN DEL PRODUCTO SELECCIONADO */}
        {selectedProduct && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📦 Información del Producto</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Producto:</span>
                <div className="font-medium text-blue-900">{selectedProduct.nameProduct}</div>
                {selectedProduct.flavor && (
                  <div className="text-blue-800">Sabor: {selectedProduct.flavor}</div>
                )}
              </div>
              <div>
                <span className="text-blue-700">Stock Actual:</span>
                <div className="font-bold text-blue-900 text-lg">{selectedProduct.minStockLevel || 0} unidades</div>
              </div>
              <div>
                <span className="text-blue-700">Código:</span>
                <div className="font-mono text-blue-900">{selectedProduct.code}</div>
              </div>
              <div>
                <span className="text-blue-700">Stock después del lote:</span>
                <div className={`font-bold text-lg ${
                  (selectedProduct.minStockLevel || 0) - formData.initialQuantity < 0 
                    ? 'text-red-600' 
                    : (selectedProduct.minStockLevel || 0) - formData.initialQuantity < 10
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {Math.max(0, (selectedProduct.minStockLevel || 0) - formData.initialQuantity)} unidades
                </div>
              </div>
            </div>
          </div>
        )}
        
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
            rightIcon={!editingBatch ? (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, batchCode: generateBatchCode() }))}
                className="text-[#7ca1eb] hover:text-[#6b90da]"
                title="Generar código"
              >
                🔄
              </button>
            ) : undefined}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const productionDate = e.target.value;
              handleInputChange('productionDate', productionDate);
              
              // Auto-calcular fecha de vencimiento solo si no está editando
              if (productionDate && !editingBatch && !formData.expirationDate) {
                const prodDate = new Date(productionDate);
                const expDate = new Date(prodDate);
                expDate.setMonth(expDate.getMonth() + 6); // 6 meses por defecto
                setFormData(prev => ({ 
                  ...prev, 
                  expirationDate: expDate.toISOString().split('T')[0]
                }));
              }
            }}
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
            max={selectedProduct ? selectedProduct.minStockLevel : 10000}
            step="1"
            value={formData.initialQuantity}
            onChange={handleQuantityChange}
            error={errors.initialQuantity}
            placeholder="Unidades producidas"
            disabled={!!editingBatch}
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">💰 Información Calculada</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800">
              <div>
                <span className="text-green-700">Costo por unidad:</span> 
                <div className="font-bold">${costPerUnit.toFixed(4)}</div>
              </div>
              {editingBatch && (
                <>
                  <div>
                    <span className="text-green-700">Unidades vendidas:</span> 
                    <div className="font-bold">{soldUnits}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Valor restante:</span> 
                    <div className="font-bold">${remainingValue.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-green-700">% Vendido:</span> 
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
            onClick={handleModalClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading || (stockWarnings.some(w => w.includes('❌')) && !editingBatch)}
          >
            {editingBatch ? 'Actualizar' : 'Registrar'} Lote
          </Button>
        </div>
      </form>
    </Modal>
  );
};