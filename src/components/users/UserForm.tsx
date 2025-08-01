// src/components/users/UserForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UserRequest, UserResponse, UserRole, IdentificationType } from '@/types';
import { validators } from '@/utils/validators';
import { formatters } from '@/utils/formatters';

interface UserFormProps {
  onSubmit: (userData: UserRequest) => Promise<void>;
  onCancel: () => void;
  user?: UserResponse | null;
  loading?: boolean;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  typeIdentification: IdentificationType;
  identificationNumber: string;
  phoneNumber: string;
  isActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  onCancel,
  user,
  loading = false,
}) => {
  const isEditing = Boolean(user);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.EMPLOYEE,
    typeIdentification: IdentificationType.CEDULA,
    identificationNumber: '',
    phoneNumber: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Cargar datos del usuario para edición
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // No mostrar contraseña actual
        confirmPassword: '',
        role: user.role,
        typeIdentification: user.typeIdentification,
        identificationNumber: user.identificationNumber,
        phoneNumber: user.phoneNumber || '',
        isActive: user.isActive,
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validaciones básicas
    if (!validators.required(formData.name)) {
      newErrors.name = 'El nombre es requerido';
    } else if (!validators.minLength(formData.name, 2)) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!validators.required(formData.email)) {
      newErrors.email = 'El email es requerido';
    } else if (!validators.email(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validación de contraseña (requerida solo para nuevos usuarios)
    if (!isEditing) {
      if (!validators.required(formData.password)) {
        newErrors.password = 'La contraseña es requerida';
      } else if (!validators.minLength(formData.password, 6)) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else {
      // Para edición, validar solo si se proporciona nueva contraseña
      if (formData.password && !validators.minLength(formData.password, 6)) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    if (!validators.required(formData.identificationNumber)) {
      newErrors.identificationNumber = 'El número de identificación es requerido';
    } else {
      // Validar según el tipo de identificación
      if (formData.typeIdentification === IdentificationType.CEDULA && 
          !validators.cedula(formData.identificationNumber)) {
        newErrors.identificationNumber = 'Número de cédula inválido';
      } else if (formData.typeIdentification === IdentificationType.RUC && 
                 !validators.ruc(formData.identificationNumber)) {
        newErrors.identificationNumber = 'Número de RUC inválido';
      }
    }

    if (formData.phoneNumber && !validators.phone(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Número de teléfono inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const userData: UserRequest = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        passwordHash: formData.password || 'unchanged', // El backend manejará esto
        role: formData.role,
        typeIdentification: formData.typeIdentification,
        identificationNumber: formData.identificationNumber.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        isActive: formData.isActive,
      };

      await onSubmit(userData);
    } catch (error) {
      // El error se maneja en el componente padre
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { value: UserRole.EMPLOYEE, label: 'Empleado' },
    { value: UserRole.ADMIN, label: 'Administrador' },
  ];

  const identificationOptions = [
    { value: IdentificationType.CEDULA, label: 'Cédula' },
    { value: IdentificationType.PASAPORTE, label: 'Pasaporte' },
    { value: IdentificationType.RUC, label: 'RUC' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Información básica */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-900">Información Personal</h4>
          
          <Input
            label="Nombre Completo *"
            value={formData.name}
            onChange={handleInputChange('name')}
            error={errors.name}
            placeholder="Ingresa el nombre completo"
          />

          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            placeholder="usuario@email.com"
          />

          <Select
            label="Tipo de Identificación *"
            value={formData.typeIdentification}
            onChange={handleInputChange('typeIdentification')}
            options={identificationOptions}
            error={errors.typeIdentification}
          />

          <Input
            label="Número de Identificación *"
            value={formData.identificationNumber}
            onChange={handleInputChange('identificationNumber')}
            error={errors.identificationNumber}
            placeholder="Ingresa el número de identificación"
          />

          <Input
            label="Número de Teléfono"
            value={formData.phoneNumber}
            onChange={handleInputChange('phoneNumber')}
            error={errors.phoneNumber}
            placeholder="09xxxxxxxx"
          />
        </div>

        {/* Configuración de cuenta */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-900">Configuración de Cuenta</h4>
          
          <Select
            label="Rol del Usuario *"
            value={formData.role}
            onChange={handleInputChange('role')}
            options={roleOptions}
            error={errors.role}
          />

          <Input
            label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña *"}
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={errors.password}
            placeholder={isEditing ? "Deja vacío para mantener actual" : "Mínimo 6 caracteres"}
          />

          {(!isEditing || formData.password) && (
            <Input
              label="Confirmar Contraseña *"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="Confirma la contraseña"
            />
          )}

          {/* Estado activo/inactivo */}
          <div className="flex items-center space-x-3 pt-4">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleInputChange('isActive')}
              className="w-4 h-4 text-[#7ca1eb] border-2 border-black rounded focus:ring-[#7ca1eb]"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      {isEditing && (
        <div className="bg-gray-50 p-4 border-2 border-gray-200">
          <h5 className="font-medium text-gray-700 mb-2">Información del Sistema</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">ID:</span>
              <span className="ml-2 text-gray-500 font-medium">{user.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Fecha de Registro:</span>
              <span className="ml-2 text-gray-500 font-medium">{formatters.date(user.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-600">Última Actualización:</span>
              <span className="ml-2 text-gray-500 font-medium">{formatters.date(user.updatedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 pt-6 border-t-2 border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={loading}
        >
          {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
        </Button>
      </div>
    </form>
  );
};