'use client';

import React, { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials, FormErrors } from '@/types/auth';

// Interfaces específicas del componente
interface LoginFormState {
  credentials: LoginCredentials;
  showPassword: boolean;
  errors: FormErrors;
  touched: Record<keyof LoginCredentials, boolean>;
}

interface ValidationRule {
  required?: boolean;
  email?: boolean;
  minLength?: number;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

// Estado inicial del formulario
const initialFormState: LoginFormState = {
  credentials: {
    email: '',
    password: '',
  },
  showPassword: false,
  errors: {},
  touched: {
    email: false,
    password: false,
  },
};

// Reglas de validación
const validationRules: ValidationRules = {
  email: [
    { required: true, message: 'El email es requerido' },
    { email: true, message: 'Ingresa un email válido' },
  ],
  password: [
    { required: true, message: 'La contraseña es requerida' },
    { minLength: 6, message: 'La contraseña debe tener al menos 6 caracteres' },
  ],
};

export const LoginForm: React.FC = () => {
  const [formState, setFormState] = useState<LoginFormState>(initialFormState);
  const { login, loading, error, clearError } = useAuth();

  // Validación de campo individual
  const validateField = useCallback((name: keyof LoginCredentials, value: string): string => {
    const rules = validationRules[name];
    if (!rules) return '';

    for (const rule of rules) {
      if (rule.required && !value.trim()) {
        return rule.message;
      }
      
      if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return rule.message;
      }
      
      if (rule.minLength && value && value.length < rule.minLength) {
        return rule.message;
      }
    }
    
    return '';
  }, []);

  // Validación completa del formulario
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(formState.credentials).forEach((key) => {
      const fieldName = key as keyof LoginCredentials;
      const error = validateField(fieldName, formState.credentials[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setFormState(prev => ({ ...prev, errors: newErrors }));
    return isValid;
  }, [formState.credentials, validateField]);

  // Manejo de cambios en inputs
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginCredentials;

    setFormState(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [fieldName]: value,
      },
      touched: {
        ...prev.touched,
        [fieldName]: true,
      },
      errors: {
        ...prev.errors,
        [fieldName]: prev.touched[fieldName] ? validateField(fieldName, value) : '',
      },
    }));
    
    // Limpia errores globales cuando el usuario empieza a escribir
    if (error) {
      clearError();
    }
  }, [error, clearError, validateField]);

  // Manejo de blur en inputs
  const handleInputBlur = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginCredentials;

    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName]: true,
      },
      errors: {
        ...prev.errors,
        [fieldName]: validateField(fieldName, value),
      },
    }));
  }, [validateField]);

  // Envío del formulario
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    setFormState(prev => ({
      ...prev,
      touched: {
        email: true,
        password: true,
      },
    }));

    if (!validateForm()) {
      return;
    }

    try {
      await login(formState.credentials);
    } catch (error) {
      // Error manejado por el contexto
      console.error('Error en login:', error);
    }
  }, [formState.credentials, validateForm, login]);

  // Toggle visibilidad de contraseña
  const togglePasswordVisibility = useCallback((): void => {
    setFormState(prev => ({
      ...prev,
      showPassword: !prev.showPassword,
    }));
  }, []);

  // Verifica si el formulario es válido
  const isFormValid = Object.keys(formState.errors).every(key => !formState.errors[key]) &&
    formState.credentials.email.trim() !== '' &&
    formState.credentials.password.trim() !== '';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#7ca1eb] border-4 border-black mx-auto mb-4 flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chocorocks</h1>
          <p className="text-gray-600">Sistema de Inventario</p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Iniciar Sesión
          </h2>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Input
              type="email"
              name="email"
              label="Correo Electrónico"
              value={formState.credentials.email}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="tu@email.com"
              required
              disabled={loading}
              error={formState.touched.email ? formState.errors.email : ''}
              leftIcon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              }
            />

            <Input
              type={formState.showPassword ? 'text' : 'password'}
              name="password"
              label="Contraseña"
              value={formState.credentials.password}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="Tu contraseña"
              required
              disabled={loading}
              error={formState.touched.password ? formState.errors.password : ''}
              leftIcon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              }
              rightIcon={
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors"
                  aria-label={formState.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {formState.showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !isFormValid}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Olvidaste tu contraseña?{' '}
              <button 
                type="button"
                className="font-semibold text-[#7ca1eb] hover:underline focus:outline-none focus:underline transition-all"
                onClick={() => {
                  // TODO: Implementar recuperación de contraseña
                  console.log('Recuperar contraseña');
                }}
              >
                Contacta al administrador
              </button>
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema de Inventario Chocorocks</p>
          <p>Tesis PUCE TEC 2025</p>
        </div>
      </div>
    </div>
  );
};