// src/components/products/ProductForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductRequest, ProductResponse, CategoryResponse } from '@/types';
import { productAPI, categoryAPI, ApiError } from '@/services/api';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: ProductResponse | null;
}

interface SelectOption {
  value: number | string;
  label: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProduct,
}) => {
  const [formData, setFormData] = useState<ProductRequest>({
    code: '',
    nameProduct: '',
    description: '',
    categoryId: 0,
    flavor: '',
    size: '',
    productionCost: 0,
    wholesalePrice: 0,
    retailPrice: 0,
    minStockLevel: 0,
    imageUrl: '',
    barcode: '',
    isActive: true,
  });

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (editingProduct) {
        setFormData({
          code: editingProduct.code,
          nameProduct: editingProduct.nameProduct,
          description: editingProduct.description || '',
          categoryId: editingProduct.category.id,
          flavor: editingProduct.flavor || '',
          size: editingProduct.size || '',
          productionCost: Number(editingProduct.productionCost),
          wholesalePrice: Number(editingProduct.wholesalePrice),
          retailPrice: Number(editingProduct.retailPrice),
          minStockLevel: editingProduct.minStockLevel,
          imageUrl: editingProduct.imageUrl || '',
          barcode: editingProduct.barcode || '',
          isActive: editingProduct.isActive,
        });
      } else {
        resetForm();
        generateProductCode();
      }
    }
  }, [isOpen, editingProduct]);

  const fetchCategories = async (): Promise<void> => {
    setLoading(true);
    try {
      const categoriesData = await categoryAPI.getAllCategories();
      setCategories(categoriesData);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar las categorías';
      setError(errorMessage);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateProductCode = (): void => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    setFormData(prev => ({ ...prev, code: `CHOCO-${timestamp}-${random}` }));
  };

  const resetForm = (): void => {
    setFormData({
      code: '',
      nameProduct: '',
      description: '',
      categoryId: 0,
      flavor: '',
      size: '',
      productionCost: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      minStockLevel: 0,
      imageUrl: '',
      barcode: '',
      isActive: true,
    });
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.nameProduct.trim()) {
      newErrors.nameProduct = 'El nombre del producto es requerido';
    } else if (formData.nameProduct.trim().length < 2) {
      newErrors.nameProduct = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nameProduct.trim().length > 150) {
      newErrors.nameProduct = 'El nombre no puede exceder 150 caracteres';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'El código del producto es requerido';
    } else if (formData.code.trim().length > 50) {
      newErrors.code = 'El código no puede exceder 50 caracteres';
    }

    if (!formData.categoryId || formData.categoryId === 0) {
      newErrors.categoryId = 'La categoría es requerida';
    }

    // Optional field validations
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    if (formData.flavor && formData.flavor.length > 100) {
      newErrors.flavor = 'El sabor no puede exceder 100 caracteres';
    }

    if (formData.size && formData.size.length > 50) {
      newErrors.size = 'El tamaño no puede exceder 50 caracteres';
    }

    if (formData.imageUrl && formData.imageUrl.length > 500) {
      newErrors.imageUrl = 'La URL de imagen no puede exceder 500 caracteres';
    }

    if (formData.barcode && formData.barcode.length > 50) {
      newErrors.barcode = 'El código de barras no puede exceder 50 caracteres';
    }

    // Numeric validations
    if (formData.productionCost < 0) {
      newErrors.productionCost = 'El costo de producción debe ser mayor o igual a 0';
    }

    if (formData.wholesalePrice < 0) {
      newErrors.wholesalePrice = 'El precio mayorista debe ser mayor o igual a 0';
    }

    if (formData.retailPrice < 0) {
      newErrors.retailPrice = 'El precio al detalle debe ser mayor o igual a 0';
    }

    if (formData.minStockLevel < 0) {
      newErrors.minStockLevel = 'El stock mínimo debe ser mayor o igual a 0';
    }

    // Business logic validations
    if (formData.wholesalePrice > 0 && formData.retailPrice > 0) {
      if (formData.wholesalePrice >= formData.retailPrice) {
        newErrors.wholesalePrice = 'El precio mayorista debe ser menor al precio al detalle';
      }
    }

    if (formData.productionCost > 0 && formData.wholesalePrice > 0) {
      if (formData.productionCost >= formData.wholesalePrice) {
        newErrors.productionCost = 'El costo de producción debe ser menor al precio mayorista';
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

    setSubmitting(true);
    setError('');

    try {
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.id, formData);
      } else {
        await productAPI.createProduct(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : editingProduct ? 'Error al actualizar el producto' : 'Error al crear el producto';
      setError(errorMessage);
      console.error('Error submitting product:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProductRequest, value: string | number | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const categoryOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar categoría...' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingProduct ? 'Editar Producto' : 'Crear Producto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading && (
          <Alert variant="info">
            Cargando categorías...
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código del Producto*"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            error={errors.code}
            disabled={!!editingProduct || submitting}
            placeholder="CHOCO-XXXX-XXXX"
            maxLength={50}
            required
            rightIcon={!editingProduct ? (
              <button
                type="button"
                onClick={generateProductCode}
                className="text-[#7ca1eb] hover:text-[#6b90da]"
                title="Generar código"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            ) : undefined}
          />

          <Input
            label="Nombre del Producto*"
            value={formData.nameProduct}
            onChange={(e) => handleInputChange('nameProduct', e.target.value)}
            error={errors.nameProduct}
            placeholder="Ej: Chocolate con Almendras"
            maxLength={150}
            required
            disabled={submitting}
          />

          <div className="md:col-span-2">
            <Input
              label="Descripción"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
              placeholder="Descripción detallada del producto"
              maxLength={1000}
              disabled={submitting}
            />
          </div>

          <Select
            label="Categoría*"
            value={formData.categoryId}
            onChange={(e) => handleInputChange('categoryId', parseInt(e.target.value))}
            options={categoryOptions}
            error={errors.categoryId}
            disabled={submitting || loading}
            required
          />

          <Input
            label="Sabor"
            value={formData.flavor}
            onChange={(e) => handleInputChange('flavor', e.target.value)}
            error={errors.flavor}
            placeholder="Ej: Almendras, Coco, etc."
            maxLength={100}
            disabled={submitting}
          />

          <Input
            label="Tamaño"
            value={formData.size}
            onChange={(e) => handleInputChange('size', e.target.value)}
            error={errors.size}
            placeholder="Ej: 100g, 250g, 500g"
            maxLength={50}
            disabled={submitting}
          />

          <Input
            label="Stock Mínimo"
            type="number"
            value={formData.minStockLevel}
            onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
            error={errors.minStockLevel}
            placeholder="0"
            min="0"
            disabled={submitting}
          />

          <Input
            label="Costo de Producción ($)"
            type="number"
            step="0.01"
            value={formData.productionCost}
            onChange={(e) => handleInputChange('productionCost', parseFloat(e.target.value) || 0)}
            error={errors.productionCost}
            placeholder="0.00"
            min="0"
            disabled={submitting}
          />

          <Input
            label="Precio Mayorista ($)"
            type="number"
            step="0.01"
            value={formData.wholesalePrice}
            onChange={(e) => handleInputChange('wholesalePrice', parseFloat(e.target.value) || 0)}
            error={errors.wholesalePrice}
            placeholder="0.00"
            min="0"
            disabled={submitting}
          />

          <Input
            label="Precio al Detalle ($)"
            type="number"
            step="0.01"
            value={formData.retailPrice}
            onChange={(e) => handleInputChange('retailPrice', parseFloat(e.target.value) || 0)}
            error={errors.retailPrice}
            placeholder="0.00"
            min="0"
            disabled={submitting}
          />

          <Input
            label="URL de Imagen"
            value={formData.imageUrl}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            error={errors.imageUrl}
            placeholder="https://ejemplo.com/imagen.jpg"
            maxLength={500}
            disabled={submitting}
          />

          <Input
            label="Código de Barras"
            value={formData.barcode}
            onChange={(e) => handleInputChange('barcode', e.target.value)}
            error={errors.barcode}
            placeholder="1234567890123"
            maxLength={50}
            disabled={submitting}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="w-4 h-4 border-2 border-black"
            disabled={submitting}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Producto activo
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            disabled={submitting || loading}
          >
            {editingProduct ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </div>
      </form>
    </Modal>
  );
};