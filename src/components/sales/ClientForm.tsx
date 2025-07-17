// src/components/sales/ClientForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { ClientRequest, ClientResponse, IdentificationType } from '@/types';
import { clientAPI, ApiError } from '@/services/api';
import { validators } from '@/utils/validators';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: ClientResponse) => void;
  editingClient?: ClientResponse | null;
}

interface SelectOption {
  value: string;
  label: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingClient,
}) => {
  const [formData, setFormData] = useState<ClientRequest>({
    nameLastname: '',
    typeIdentification: IdentificationType.CEDULA,
    identificationNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    requiresInvoice: false,
    isActive: true,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editingClient) {
        setFormData({
          nameLastname: editingClient.nameLastname,
          typeIdentification: editingClient.typeIdentification,
          identificationNumber: editingClient.identificationNumber,
          phoneNumber: editingClient.phoneNumber || '',
          email: editingClient.email || '',
          address: editingClient.address || '',
          requiresInvoice: editingClient.requiresInvoice,
          isActive: editingClient.isActive,
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingClient]);

  const resetForm = (): void => {
    setFormData({
      nameLastname: '',
      typeIdentification: IdentificationType.CEDULA,
      identificationNumber: '',
      phoneNumber: '',
      email: '',
      address: '',
      requiresInvoice: false,
      isActive: true,
    });
    setErrors({});
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.nameLastname.trim()) {
      newErrors.nameLastname = 'El nombre es requerido';
    } else if (formData.nameLastname.trim().length < 2) {
      newErrors.nameLastname = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nameLastname.trim().length > 150) {
      newErrors.nameLastname = 'El nombre no puede exceder 150 caracteres';
    }

    if (!formData.identificationNumber.trim()) {
      newErrors.identificationNumber = 'El número de identificación es requerido';
    } else {
      // Validate based on identification type
      switch (formData.typeIdentification) {
        case IdentificationType.CEDULA:
          if (!validators.cedula(formData.identificationNumber)) {
            newErrors.identificationNumber = 'Número de cédula inválido';
          }
          break;
        case IdentificationType.RUC:
          if (!validators.ruc(formData.identificationNumber)) {
            newErrors.identificationNumber = 'Número de RUC inválido';
          }
          break;
        case IdentificationType.PASAPORTE:
          if (formData.identificationNumber.length < 6 || formData.identificationNumber.length > 20) {
            newErrors.identificationNumber = 'El pasaporte debe tener entre 6 y 20 caracteres';
          }
          break;
      }
    }

    // Optional field validations
    if (formData.email && !validators.email(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.phoneNumber && !validators.phone(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Número de teléfono inválido';
    }

    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'La dirección no puede exceder 500 caracteres';
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
      let savedClient: ClientResponse;
      
      if (editingClient) {
        savedClient = await clientAPI.updateClient(editingClient.id, formData);
      } else {
        savedClient = await clientAPI.createClient(formData);
      }
      
      onSuccess(savedClient);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : editingClient ? 'Error al actualizar el cliente' : 'Error al crear el cliente';
      setError(errorMessage);
      console.error('Error submitting client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ClientRequest, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const identificationTypeOptions: SelectOption[] = [
    { value: IdentificationType.CEDULA, label: 'Cédula' },
    { value: IdentificationType.RUC, label: 'RUC' },
    { value: IdentificationType.PASAPORTE, label: 'Pasaporte' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
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
            label="Nombre Completo*"
            value={formData.nameLastname}
            onChange={(e) => handleInputChange('nameLastname', e.target.value)}
            error={errors.nameLastname}
            placeholder="Ej: Juan Pérez García"
            maxLength={150}
            required
            disabled={submitting}
          />

          <Select
            label="Tipo de Identificación*"
            value={formData.typeIdentification}
            onChange={(e) => handleInputChange('typeIdentification', e.target.value as IdentificationType)}
            options={identificationTypeOptions}
            error={errors.typeIdentification}
            disabled={submitting}
            required
          />

          <Input
            label="Número de Identificación*"
            value={formData.identificationNumber}
            onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
            error={errors.identificationNumber}
            placeholder={
              formData.typeIdentification === IdentificationType.CEDULA ? '1234567890' :
              formData.typeIdentification === IdentificationType.RUC ? '1234567890001' :
              'AB123456'
            }
            maxLength={20}
            required
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

          <div className="md:col-span-2">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              placeholder="cliente@ejemplo.com"
              maxLength={150}
              disabled={submitting}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Dirección"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              error={errors.address}
              placeholder="Dirección completa del cliente"
              maxLength={500}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requiresInvoice"
              checked={formData.requiresInvoice}
              onChange={(e) => handleInputChange('requiresInvoice', e.target.checked)}
              className="w-4 h-4 border-2 border-black"
              disabled={submitting}
            />
            <label htmlFor="requiresInvoice" className="text-sm font-medium text-gray-700">
              Requiere factura
            </label>
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
              Cliente activo
            </label>
          </div>
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
            {editingClient ? 'Actualizar' : 'Crear'} Cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
};