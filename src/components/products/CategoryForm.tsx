// src/components/products/CategoryForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryRequest, CategoryResponse } from '@/types';
import { categoryAPI, ApiError } from '@/services/api';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
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
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; category: CategoryResponse | null }>({
    show: false,
    category: null
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  const fetchCategories = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
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

  const resetForm = (): void => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la categoría es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    // Check if category name already exists (excluding current editing category)
    const nameExists = categories.some(cat => 
      cat.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      cat.id !== editingCategory?.id
    );
    if (nameExists) {
      newErrors.name = 'Ya existe una categoría con este nombre';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
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
      if (editingCategory) {
        await categoryAPI.updateCategory(editingCategory.id, formData);
      } else {
        await categoryAPI.createCategory(formData);
      }
      
      resetForm();
      await fetchCategories();
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : editingCategory ? 'Error al actualizar la categoría' : 'Error al crear la categoría';
      setError(errorMessage);
      console.error('Error submitting category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: CategoryResponse): void => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setErrors({});
    setError('');
  };

  const handleDeleteClick = (category: CategoryResponse): void => {
    setDeleteConfirm({ show: true, category });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm.category) return;

    try {
      await categoryAPI.deleteCategory(deleteConfirm.category.id);
      await fetchCategories();
      setDeleteConfirm({ show: false, category: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar la categoría. Verifique que no tenga productos asociados.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, category: null });
      console.error('Error deleting category:', err);
    }
  };

  const handleInputChange = (field: keyof CategoryRequest, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const columns: TableColumn<CategoryResponse>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (value: string | null) => (
        <span className="text-sm text-gray-600">
          {value || 'Sin descripción'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      ),
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
            disabled={submitting}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(row)}
            disabled={submitting}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="Gestión de Categorías"
        size="lg"
      >
        <div className="space-y-6">
          {error && (
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Card title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre de la Categoría*"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="Ej: Chocolates Premium"
                  maxLength={100}
                  required
                  disabled={submitting}
                />

                <Input
                  label="Descripción"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  error={errors.description}
                  placeholder="Descripción de la categoría"
                  maxLength={500}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Limpiar
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={submitting}
                >
                  {editingCategory ? 'Actualizar' : 'Crear'} Categoría
                </Button>
              </div>
            </form>
          </Card>

          <Card title={`Categorías Existentes (${categories.length})`}>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
              </div>
            ) : categories.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.994.994 0 01-.707.293H7a4 4 0 01-4-4V7a4 4 0 014-4z" />
                  </svg>
                }
                title="No hay categorías"
                description="Crea tu primera categoría para organizar los productos"
                action={{
                  text: "Crear primera categoría",
                  onClick: () => {
                    resetForm();
                    const nameInput = document.querySelector('input[placeholder="Ej: Chocolates Premium"]') as HTMLInputElement;
                    nameInput?.focus();
                  }
                }}
              />
            ) : (
              <Table
                data={categories}
                columns={columns}
                loading={false}
                emptyMessage="No hay categorías creadas"
              />
            )}
          </Card>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, category: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${deleteConfirm.category?.name}"? Esta acción no se puede deshacer y solo será posible si no tiene productos asociados.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  );
};