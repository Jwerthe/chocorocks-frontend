// src/components/products/ProductList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ProductForm } from './ProductForm';
import { CategoryForm } from './CategoryForm';
import { ProductResponse, CategoryResponse, ProductFilters } from '@/types';
import { productAPI, categoryAPI } from '@/services/api';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoryId: undefined,
    flavor: '',
    isActive: undefined,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data);
      setError('');
    } catch (err) {
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      return;
    }

    try {
      await productAPI.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      setError('Error al eliminar el producto. Verifique que no tenga stock asociado.');
    }
  };

  const handleEditProduct = (product: ProductResponse) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleProductFormClose = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleProductFormSuccess = () => {
    fetchProducts();
  };

  const handleCategoryFormSuccess = () => {
    fetchCategories();
  };

  const handleSearch = async () => {
    if (!filters.search && !filters.categoryId && !filters.flavor && filters.isActive === undefined) {
      fetchProducts();
      return;
    }

    setLoading(true);
    try {
      const data = await productAPI.searchProducts(filters);
      setProducts(data);
      setError('');
    } catch (err) {
      setError('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: undefined,
      flavor: '',
      isActive: undefined,
    });
    fetchProducts();
  };

  const filteredProducts = products.filter(product => {
    return (
      (!filters.search || 
        product.nameProduct.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.code.toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.categoryId || product.category.id === filters.categoryId) &&
      (!filters.flavor || 
        product.flavor?.toLowerCase().includes(filters.flavor.toLowerCase())) &&
      (filters.isActive === undefined || product.isActive === filters.isActive)
    );
  });

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' },
  ];

  const columns = [
    {
      key: 'imageUrl',
      header: 'Imagen',
      render: (value: string) => (
        <div className="w-12 h-12 bg-gray-200 border-2 border-black flex items-center justify-center">
          {value ? (
            <img src={value} alt="Producto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">Sin imagen</span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      render: (value: string) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'nameProduct',
      header: 'Nombre',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'category.name',
      header: 'Categoría',
      render: (value: string) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: 'flavor',
      header: 'Sabor',
      render: (value: string) => value || '-',
    },
    {
      key: 'size',
      header: 'Tamaño',
      render: (value: string) => value || '-',
    },
    {
      key: 'retailPrice',
      header: 'Precio Detalle',
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      key: 'wholesalePrice',
      header: 'Precio Mayorista',
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      key: 'minStockLevel',
      header: 'Stock Mín.',
      render: (value: number) => value,
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
      render: (_: any, row: ProductResponse) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditProduct(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteProduct(row.id)}
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-1">Administra el catálogo de productos de Chocorocks</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCategoryForm(true)}
          >
            Gestionar Categorías
          </Button>
          <Button onClick={() => setShowProductForm(true)}>
            + Nuevo Producto
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por nombre o código..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          
          <Select
            options={categoryOptions}
            value={filters.categoryId?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              categoryId: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
          />
          
          <Input
            placeholder="Filtrar por sabor..."
            value={filters.flavor}
            onChange={(e) => setFilters(prev => ({ ...prev, flavor: e.target.value }))}
          />
          
          <Select
            options={statusOptions}
            value={filters.isActive?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
            }))}
          />
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar Filtros
          </Button>
          <Button onClick={handleSearch}>
            Buscar
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">
            Productos ({filteredProducts.length})
          </h2>
        </div>
        
        <Table
          data={filteredProducts}
          columns={columns}
          loading={loading}
          emptyMessage="No se encontraron productos"
        />
      </Card>

      <ProductForm
        isOpen={showProductForm}
        onClose={handleProductFormClose}
        onSuccess={handleProductFormSuccess}
        editingProduct={editingProduct}
      />

      <CategoryForm
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        onSuccess={handleCategoryFormSuccess}
      />
    </div>
  );
};