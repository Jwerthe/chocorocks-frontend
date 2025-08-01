// src/components/stores/StoreForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { StoreRequest, StoreResponse, UserResponse, StoreType } from '@/types';
import { storeAPI, ApiError } from '@/services/api';

interface StoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStore?: StoreResponse | null;
  users: UserResponse[];
}

interface SelectOption {
  value: number | string;
  label: string;
}

export const StoreForm: React.FC<StoreFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingStore,
  users,
}) => {
  const [formData, setFormData] = useState<StoreRequest>({
    name: '',
    address: '',
    managerId: undefined,
    typeStore: StoreType.FISICA,
    phoneNumber: '',
    scheduleOpen: '',
    scheduleClosed: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editingStore) {
        setFormData({
          name: editingStore.name,
          address: editingStore.address,
          managerId: editingStore.manager?.id,
          typeStore: editingStore.typeStore,
          phoneNumber: editingStore.phoneNumber || '',
          scheduleOpen: editingStore.scheduleOpen || '',
          scheduleClosed: editingStore.scheduleClosed || '',
          isActive: editingStore.isActive,
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingStore]);

  const resetForm = (): void => {
    setFormData({
      name: '',
      address: '',
      managerId: undefined,
      typeStore: StoreType.FISICA,
      phoneNumber: '',
      scheduleOpen: '',
      scheduleClosed: '',
      isActive: true,
    });
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la tienda es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es requerida';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'La dirección debe tener al menos 5 caracteres';
    }

    // Optional field validations
    if (formData.phoneNumber && !/^[\d\-\+\(\)\s]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Número de teléfono inválido';
    }

    if (formData.phoneNumber && formData.phoneNumber.length > 15) {
      newErrors.phoneNumber = 'El teléfono no puede exceder 15 caracteres';
    }

    // Time validations
    if (formData.scheduleOpen && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.scheduleOpen)) {
      newErrors.scheduleOpen = 'Formato de hora inválido (HH:MM)';
    }

    if (formData.scheduleClosed && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.scheduleClosed)) {
      newErrors.scheduleClosed = 'Formato de hora inválido (HH:MM)';
    }

    // Business logic validations
    if (formData.scheduleOpen && formData.scheduleClosed) {
      const openTime = new Date(`2000-01-01T${formData.scheduleOpen}:00`);
      const closeTime = new Date(`2000-01-01T${formData.scheduleClosed}:00`);
      
      if (openTime >= closeTime) {
        newErrors.scheduleClosed = 'La hora de cierre debe ser posterior a la hora de apertura';
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
      if (editingStore) {
        await storeAPI.updateStore(editingStore.id, formData);
      } else {
        await storeAPI.createStore(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : editingStore ? 'Error al actualizar la tienda' : 'Error al crear la tienda';
      setError(errorMessage);
      console.error('Error submitting store:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof StoreRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const storeTypeOptions: SelectOption[] = [
    { value: StoreType.FISICA, label: 'Tienda Física' },
    { value: StoreType.MOVIL, label: 'Tienda Móvil' },
    { value: StoreType.BODEGA, label: 'Bodega' },
  ];

  const managerOptions: SelectOption[] = [
    { value: '', label: 'Sin gerente asignado' },
    ...users.map(user => ({ value: user.id, label: user.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingStore ? 'Editar Tienda' : 'Crear Nueva Tienda'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre de la Tienda*"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            placeholder="Ej: Tienda Centro Histórico"
            maxLength={100}
            required
            disabled={submitting}
          />

          <Select
            label="Tipo de Tienda*"
            value={formData.typeStore}
            onChange={(e) => handleInputChange('typeStore', e.target.value as StoreType)}
            options={storeTypeOptions}
            error={errors.typeStore}
            disabled={submitting}
            required
          />

          <div className="md:col-span-2">
            <Input
              label="Dirección*"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              error={errors.address}
              placeholder="Dirección completa de la tienda"
              required
              disabled={submitting}
            />
          </div>

          <Select
            label="Gerente Asignado"
            value={formData.managerId?.toString() || ''}
            onChange={(e) => handleInputChange('managerId', e.target.value ? parseInt(e.target.value) : undefined)}
            options={managerOptions}
            error={errors.managerId}
            disabled={submitting}
          />

          <Input
            label="Teléfono"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            error={errors.phoneNumber}
            placeholder="0987654321"
            maxLength={15}
            disabled={submitting}
          />

          <Input
            label="Hora de Apertura"
            type="time"
            value={formData.scheduleOpen}
            onChange={(e) => handleInputChange('scheduleOpen', e.target.value)}
            error={errors.scheduleOpen}
            disabled={submitting}
          />

          <Input
            label="Hora de Cierre"
            type="time"
            value={formData.scheduleClosed}
            onChange={(e) => handleInputChange('scheduleClosed', e.target.value)}
            error={errors.scheduleClosed}
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
            Tienda activa
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
            disabled={submitting}
          >
            {editingStore ? 'Actualizar' : 'Crear'} Tienda
          </Button>
        </div>
      </form>
    </Modal>
  );
};