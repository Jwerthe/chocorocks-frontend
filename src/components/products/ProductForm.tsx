// src/components/products/ProductForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ProductRequest, ProductResponse, CategoryResponse } from '@/types';
import { productAPI, categoryAPI } from '@/services/api';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: ProductResponse | null;
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
  const [loading, setLoading] = useState(false);
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
          productionCost: editingProduct.productionCost,
          wholesalePrice: editingProduct.wholesalePrice,
          retailPrice: editingProduct.retailPrice,
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

  const fetchCategories = async () => {
    try {
      const categoriesData = await categoryAPI.getAllCategories();
      setCategories(categoriesData);
    } catch (err) {
      setError('Error al cargar las categorías');
    }
  };

  const generateProductCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    setFormData(prev => ({ ...prev, code: `CHOCO-${timestamp}-${random}`.toUpperCase() }));
  };

  const resetForm = () => {
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

    if (!formData.nameProduct.trim()) {
      newErrors.nameProduct = 'El nombre del producto es requerido';
    }

    if (!formData.categoryId || formData.categoryId === 0) {
      newErrors.categoryId = 'La categoría es requerida';
    }

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
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.id, formData);
      } else {
        await productAPI.createProduct(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(editingProduct ? 'Error al actualizar el producto' : 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductRequest, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const categoryOptions = [
    { value: 0, label: 'Seleccionar categoría...' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editar Producto' : 'Crear Producto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código del Producto"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            error={errors.code}
            disabled={!!editingProduct}
            placeholder="CHOCO-XXXX-XXXX"
          />

          <Input
            label="Nombre del Producto*"
            value={formData.nameProduct}
            onChange={(e) => handleInputChange('nameProduct', e.target.value)}
            error={errors.nameProduct}
            placeholder="Ej: Chocolate con Almendras"
          />

          <div className="md:col-span-2">
            <Input
              label="Descripción"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
              placeholder="Descripción detallada del producto"
            />
          </div>

          <Select
            label="Categoría*"
            value={formData.categoryId}
            onChange={(e) => handleInputChange('categoryId', parseInt(e.target.value))}
            options={categoryOptions}
            error={errors.categoryId}
          />

          <Input
            label="Sabor"
            value={formData.flavor}
            onChange={(e) => handleInputChange('flavor', e.target.value)}
            error={errors.flavor}
            placeholder="Ej: Almendras, Coco, etc."
          />

          <Input
            label="Tamaño"
            value={formData.size}
            onChange={(e) => handleInputChange('size', e.target.value)}
            error={errors.size}
            placeholder="Ej: 100g, 250g, 500g"
          />

          <Input
            label="Stock Mínimo"
            type="number"
            value={formData.minStockLevel}
            onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
            error={errors.minStockLevel}
            placeholder="0"
          />

          <Input
            label="Costo de Producción ($)"
            type="number"
            step="0.01"
            value={formData.productionCost}
            onChange={(e) => handleInputChange('productionCost', parseFloat(e.target.value) || 0)}
            error={errors.productionCost}
            placeholder="0.00"
          />

          <Input
            label="Precio Mayorista ($)"
            type="number"
            step="0.01"
            value={formData.wholesalePrice}
            onChange={(e) => handleInputChange('wholesalePrice', parseFloat(e.target.value) || 0)}
            error={errors.wholesalePrice}
            placeholder="0.00"
          />

          <Input
            label="Precio al Detalle ($)"
            type="number"
            step="0.01"
            value={formData.retailPrice}
            onChange={(e) => handleInputChange('retailPrice', parseFloat(e.target.value) || 0)}
            error={errors.retailPrice}
            placeholder="0.00"
          />

          <Input
            label="URL de Imagen"
            value={formData.imageUrl}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            error={errors.imageUrl}
            placeholder="https://ejemplo.com/imagen.jpg"
          />

          <Input
            label="Código de Barras"
            value={formData.barcode}
            onChange={(e) => handleInputChange('barcode', e.target.value)}
            error={errors.barcode}
            placeholder="1234567890123"
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
            Producto activo
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
            {editingProduct ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </div>
      </form>
    </Modal>
  );
};