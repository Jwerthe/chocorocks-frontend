// src/components/products/CategoryForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { CategoryRequest, CategoryResponse } from '@/types';
import { categoryAPI } from '@/services/api';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [formData, setFormData] = useState<CategoryRequest>({
    name: '',
    description: '',
  });
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
      setError('');
    } catch (err) {
      setError('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la categoría es requerido';
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
      if (editingCategory) {
        await categoryAPI.updateCategory(editingCategory.id, formData);
      } else {
        await categoryAPI.createCategory(formData);
      }
      
      resetForm();
      fetchCategories();
      onSuccess();
    } catch (err) {
      setError(editingCategory ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: CategoryResponse) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return;
    }

    try {
      await categoryAPI.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      setError('Error al eliminar la categoría. Verifique que no tenga productos asociados.');
    }
  };

  const handleInputChange = (field: keyof CategoryRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (value: string) => value || '-',
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: CategoryResponse) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Categorías"
      size="lg"
    >
      <div className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <Card title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre de la Categoría*"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                placeholder="Ej: Chocolates Premium"
              />

              <Input
                label="Descripción"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={errors.description}
                placeholder="Descripción de la categoría"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={loading}
              >
                {editingCategory ? 'Actualizar' : 'Crear'} Categoría
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Categorías Existentes">
          <Table
            data={categories}
            columns={columns}
            loading={loading}
            emptyMessage="No hay categorías creadas"
          />
        </Card>
      </div>
    </Modal>
  );
};