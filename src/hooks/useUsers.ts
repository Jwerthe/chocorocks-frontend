// src/hooks/useUsers.ts - CORREGIDO
import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '@/services/api';
import { UserResponse, UserRequest, debugUserRequest, validateUserRequest } from '@/types';

interface UseUsersState {
  users: UserResponse[];
  loading: boolean;
  error: string | null;
}

interface UseUsersReturn extends UseUsersState {
  createUser: (userData: UserRequest) => Promise<UserResponse>;
  updateUser: (id: number, userData: UserRequest) => Promise<UserResponse>;
  deleteUser: (id: number) => Promise<void>;
  getUserById: (id: number) => Promise<UserResponse>;
  refreshUsers: () => Promise<void>;
  clearError: () => void;
}

export const useUsers = (): UseUsersReturn => {
  const [state, setState] = useState<UseUsersState>({
    users: [],
    loading: true,
    error: null,
  });

  const setLoading = useCallback((loading: boolean): void => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null): void => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const setUsers = useCallback((users: UserResponse[]): void => {
    setState(prev => ({ ...prev, users, loading: false, error: null }));
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 Cargando usuarios...');
      
      const users = await userAPI.getAllUsers();
      console.log('✅ Usuarios cargados:', users.length);
      
      setUsers(users);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar usuarios';
      console.error('❌ Error cargando usuarios:', errorMessage);
      setError(errorMessage);
    }
  }, [setLoading, setUsers, setError]);

  const createUser = useCallback(async (userData: UserRequest): Promise<UserResponse> => {
    try {
      // ✅ VALIDACIÓN: Verificar datos antes del envío
      const validationErrors = validateUserRequest(userData);
      if (validationErrors.length > 0) {
        throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
      }

      // ✅ DEBUG: Log para debugging
      debugUserRequest(userData, 'createUser');

      console.log('📤 Creando usuario con datos:', {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        typeIdentification: userData.typeIdentification,
        identificationNumber: userData.identificationNumber,
        phoneNumber: userData.phoneNumber,
        isActive: userData.isActive,
        hasPassword: !!userData.password,
        passwordLength: userData.password?.length || 0
      });

      const newUser = await userAPI.createUser(userData);
      
      console.log('✅ Usuario creado exitosamente:', newUser);
      
      setState(prev => ({
        ...prev,
        users: [...prev.users, newUser],
        error: null
      }));
      
      return newUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear usuario';
      console.error('❌ Error creando usuario:', error);
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const updateUser = useCallback(async (id: number, userData: UserRequest): Promise<UserResponse> => {
    try {
      // ✅ VALIDACIÓN: Para actualización, la contraseña puede ser opcional
      const updateData = { ...userData };
      
      // Si no hay contraseña en la actualización, no validarla
      if (!updateData.password) {
        // Para actualizaciones, si no hay password, usar un valor especial que el backend entienda
        updateData.password = 'KEEP_CURRENT_PASSWORD';
      }

      debugUserRequest(updateData, 'updateUser');

      console.log('📝 Actualizando usuario ID:', id, 'con datos:', {
        name: updateData.name,
        email: updateData.email,
        role: updateData.role,
        typeIdentification: updateData.typeIdentification,
        identificationNumber: updateData.identificationNumber,
        phoneNumber: updateData.phoneNumber,
        isActive: updateData.isActive,
        hasNewPassword: updateData.password !== 'KEEP_CURRENT_PASSWORD'
      });

      const updatedUser = await userAPI.updateUser(id, updateData);
      
      console.log('✅ Usuario actualizado exitosamente:', updatedUser);
      
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === id ? updatedUser : user
        ),
        error: null
      }));
      
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario';
      console.error('❌ Error actualizando usuario:', error);
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const deleteUser = useCallback(async (id: number): Promise<void> => {
    try {
      console.log('🗑️ Eliminando usuario ID:', id);
      
      await userAPI.deleteUser(id);
      
      console.log('✅ Usuario eliminado exitosamente');
      
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== id),
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      console.error('❌ Error eliminando usuario:', error);
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const getUserById = useCallback(async (id: number): Promise<UserResponse> => {
    try {
      console.log('🔍 Obteniendo usuario ID:', id);
      
      const user = await userAPI.getUserById(id);
      
      console.log('✅ Usuario obtenido:', user);
      
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener usuario';
      console.error('❌ Error obteniendo usuario:', error);
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const refreshUsers = useCallback(async (): Promise<void> => {
    console.log('🔄 Refrescando lista de usuarios...');
    await loadUsers();
  }, [loadUsers]);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    ...state,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    refreshUsers,
    clearError,
  };
};