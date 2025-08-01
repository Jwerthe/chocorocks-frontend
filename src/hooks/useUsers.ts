// src/hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '@/services/api';
import { UserResponse, UserRequest } from '@/types';

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
      const users = await userAPI.getAllUsers();
      setUsers(users);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar usuarios';
      setError(errorMessage);
    }
  }, [setLoading, setUsers, setError]);

  const createUser = useCallback(async (userData: UserRequest): Promise<UserResponse> => {
    try {
      const newUser = await userAPI.createUser(userData);
      setState(prev => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      return newUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear usuario';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const updateUser = useCallback(async (id: number, userData: UserRequest): Promise<UserResponse> => {
    try {
      const updatedUser = await userAPI.updateUser(id, userData);
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === id ? updatedUser : user
        ),
      }));
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const deleteUser = useCallback(async (id: number): Promise<void> => {
    try {
      await userAPI.deleteUser(id);
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== id),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const getUserById = useCallback(async (id: number): Promise<UserResponse> => {
    try {
      return await userAPI.getUserById(id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener usuario';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  const refreshUsers = useCallback(async (): Promise<void> => {
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