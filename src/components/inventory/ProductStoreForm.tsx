// src/components/inventory/ProductStoreForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductStoreRequest, ProductStoreResponse, ProductResponse, StoreResponse } from '@/types';
import { productStoreAPI, productAPI, storeAPI, ApiError } from '@/services/api';
import { useNotification } from '@/hooks/useNotification';

interface ProductStoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProductStore?: ProductStoreResponse | null;
}

interface FormErrors {
  [key: string]: string;
}

interface FormData {
  productId: number;
  storeId: number;
  currentStock: number;
  minStockLevel: number;
}

interface SelectOption {
  value: number | string;
  label: string;
}

export const ProductStoreForm: React.FC<ProductStoreFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProductStore,
}) => {
  const { success, error: notifyError } = useNotification();

  const [formData, setFormData] = useState<FormData>({
    productId: 0,
    storeId: 0,
    currentStock: 0,
    minStockLevel: 0,
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreResponse | null>(null);
  const [existingProductStores, setExistingProductStores] = useState<ProductStoreResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});

  const resetForm = useCallback((): void => {
    setFormData({
      productId: 0,
      storeId: 0,
      currentStock: 0,
      minStockLevel: 0,
    });
    setErrors({});
    setError('');
    setSelectedProduct(null);
    setSelectedStore(null);
  }, []);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter((p: ProductResponse) => p.isActive));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al cargar los productos';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter((s: StoreResponse) => s.isActive));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al cargar las tiendas';
      setError(errorMessage);
      console.error('Error fetching stores:', err);
    }
  }, []);

  const fetchExistingProductStores = useCallback(async (): Promise<void> => {
    try {
      const data = await productStoreAPI.getAllProductStores();
      setExistingProductStores(data);
    } catch (err) {
      console.error('Error al cargar relaciones producto-tienda existentes:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchStores();
      fetchExistingProductStores();
      
      if (editingProductStore) {
        setFormData({
          productId: editingProductStore.product.id,
          storeId: editingProductStore.store.id,
          currentStock: editingProductStore.currentStock,
          minStockLevel: editingProductStore.minStockLevel,
        });
        setSelectedProduct(editingProductStore.product);
        setSelectedStore(editingProductStore.store);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingProductStore, fetchProducts, fetchStores, fetchExistingProductStores, resetForm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validación de producto
    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    // Validación de tienda
    if (!formData.storeId || formData.storeId === 0) {
      newErrors.storeId = 'La tienda es requerida';
    }

    // Validación de combinación única (solo al crear o si se cambia la combinación)
    if (!editingProductStore || 
        (editingProductStore && 
         (formData.productId !== editingProductStore.product.id || 
          formData.storeId !== editingProductStore.store.id))) {
      
      if (formData.productId && formData.storeId) {
        const isDuplicate = existingProductStores.some((ps: ProductStoreResponse) => 
          ps.product.id === formData.productId && 
          ps.store.id === formData.storeId &&
          (!editingProductStore || ps.id !== editingProductStore.id)
        );
        if (isDuplicate) {
          newErrors.combination = 'Esta combinación de producto y tienda ya existe.';
        }
      }
    }

    // Validación de stock actual
    if (formData.currentStock < 0) {
      newErrors.currentStock = 'El stock actual no puede ser negativo';
    } else if (formData.currentStock > 999999) {
      newErrors.currentStock = 'El stock actual no puede ser mayor a 999,999';
    }

    // Validación de stock mínimo
    if (formData.minStockLevel < 0) {
      newErrors.minStockLevel = 'El stock mínimo no puede ser negativo';
    } else if (formData.minStockLevel > 999999) {
      newErrors.minStockLevel = 'El stock mínimo no puede ser mayor a 999,999';
    }

    // Validación de lógica de negocio
    if (formData.minStockLevel > formData.currentStock && formData.currentStock > 0) {
      newErrors.minStockLevel = 'El stock mínimo no debería ser mayor al stock actual';
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
      const submitData: ProductStoreRequest = {
        productId: formData.productId,
        storeId: formData.storeId,
        currentStock: formData.currentStock,
        minStockLevel: formData.minStockLevel,
      };

      if (editingProductStore) {
        await productStoreAPI.updateProductStore(editingProductStore.id, submitData);
        success('Relación producto-tienda actualizada correctamente');
      } else {
        await productStoreAPI.createProductStore(submitData);
        success('Producto agregado a tienda correctamente');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 
        (editingProductStore ? 'Error al actualizar la relación' : 'Error al agregar el producto a la tienda');
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const productId = parseInt(e.target.value) || 0;
    setFormData((prev: FormData) => ({ ...prev, productId }));
    
    if (productId !== 0) {
      try {
        const product = await productAPI.getProductById(productId);
        setSelectedProduct(product);
        console.log(`Producto seleccionado: ${product.nameProduct}`);
      } catch (err) {
        setSelectedProduct(null);
        console.error('Error fetching product details:', err);
      }
    } else {
      setSelectedProduct(null);
    }

    // Clear error when user changes selection
    if (errors.productId) {
      setErrors((prev: FormErrors) => ({ ...prev, productId: '' }));
    }
  };

  const handleStoreChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const storeId = parseInt(e.target.value) || 0;
    setFormData((prev: FormData) => ({ ...prev, storeId }));
    
    if (storeId !== 0) {
      try {
        const store = await storeAPI.getStoreById(storeId);
        setSelectedStore(store);
        console.log(`Tienda seleccionada: ${store.name}`);
      } catch (err) {
        setSelectedStore(null);
        console.error('Error fetching store details:', err);
      }
    } else {
      setSelectedStore(null);
    }

    // Clear error when user changes selection
    if (errors.storeId) {
      setErrors((prev: FormErrors) => ({ ...prev, storeId: '' }));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number): void => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: FormErrors) => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberInputChange = (field: 'currentStock' | 'minStockLevel') => 
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      
      if (value === '') {
        handleInputChange(field, 0);
        return;
      }
      
      const numValue = parseInt(value) || 0;
      handleInputChange(field, numValue);
    };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map((product: ProductResponse) => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} - ${product.category.name}` 
    }))
  ];

  const storeOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar tienda...' },
    ...stores.map((store: StoreResponse) => ({ 
      value: store.id, 
      label: `${store.name} - ${store.address}` 
    }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingProductStore ? 'Editar Producto en Tienda' : 'Agregar Producto a Tienda'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

        {errors.combination && (
          <Alert variant="error">{errors.combination}</Alert>
        )}

        {/* Información del producto y tienda seleccionados */}
        {selectedProduct && selectedStore && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Información de la Relación</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Producto:</span>
                <div className="font-medium text-blue-900">{selectedProduct.nameProduct}</div>
                <div className="text-blue-800">Código: {selectedProduct.code}</div>
                {selectedProduct.flavor && (
                  <div className="text-blue-800">Sabor: {selectedProduct.flavor}</div>
                )}
              </div>
              <div>
                <span className="text-blue-700">Tienda:</span>
                <div className="font-medium text-blue-900">{selectedStore.name}</div>
                <div className="text-blue-800">Dirección: {selectedStore.address}</div>
                <div className="text-blue-800">Tipo: {selectedStore.typeStore}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Producto*"
            value={formData.productId}
            onChange={handleProductChange}
            options={productOptions}
            error={errors.productId}
            // Remove the disabled prop to allow editing of the relationship
            // disabled={!!editingProductStore}
          />

          <Select
            label="Tienda*"
            value={formData.storeId}
            onChange={handleStoreChange}
            options={storeOptions}
            error={errors.storeId}
            // Remove the disabled prop to allow editing of the relationship
            // disabled={!!editingProductStore}
          />

          <Input
            label="Stock Actual*"
            type="number"
            min="0"
            max="999999"
            step="1"
            value={formData.currentStock || ''}
            onChange={handleNumberInputChange('currentStock')}
            error={errors.currentStock}
            placeholder="Cantidad disponible en tienda"
          />

          <Input
            label="Stock Mínimo*"
            type="number"
            min="0"
            max="999999"
            step="1"
            value={formData.minStockLevel || ''}
            onChange={handleNumberInputChange('minStockLevel')}
            error={errors.minStockLevel}
            placeholder="Nivel mínimo de alerta"
          />
        </div>

        {/* Información calculada */}
        {formData.currentStock > 0 && formData.minStockLevel > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Estado del Stock</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
              <div>
                <span className="text-green-700">Estado:</span> 
                <div className="font-bold">
                  {formData.currentStock === 0 ? 'Sin Stock' :
                   formData.currentStock <= formData.minStockLevel * 0.5 ? 'Crítico' :
                   formData.currentStock <= formData.minStockLevel ? 'Bajo' : 'Normal'}
                </div>
              </div>
              <div>
                <span className="text-green-700">Días de stock:</span> 
                <div className="font-bold">
                  {formData.minStockLevel > 0 ? 
                    Math.ceil(formData.currentStock / (formData.minStockLevel * 0.1)) : 'N/A'} días aprox.
                </div>
              </div>
            </div>
          </div>
        )}

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
            disabled={loading}
          >
            {editingProductStore ? 'Actualizar' : 'Agregar'} Producto a Tienda
          </Button>
        </div>
      </form>
    </Modal>
  );
};