// src/hooks/useAuthNumericId.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/services/api';

interface UseAuthNumericIdReturn {
  numericUserId: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener el ID numérico del usuario del backend
 * basado en el email del usuario autenticado en Supabase
 */
export const useAuthNumericId = (): UseAuthNumericIdReturn => {
  const { user } = useAuth();
  const [numericUserId, setNumericUserId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNumericUserId = useCallback(async (): Promise<void> => {
    if (!user?.email) {
      setError('No hay usuario autenticado');
      setNumericUserId(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [useAuthNumericId] Buscando usuario en backend por email:', user.email);
      
      const users = await userAPI.getAllUsers();
      const backendUser = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
      
      if (backendUser) {
        console.log(`✅ [useAuthNumericId] Usuario encontrado: ID=${backendUser.id}, Email=${backendUser.email}`);
        setNumericUserId(backendUser.id);
        setError(null);
      } else {
        console.error('❌ [useAuthNumericId] Usuario no encontrado en backend con email:', user.email);
        setError(`Usuario no encontrado en el sistema con email: ${user.email}`);
        setNumericUserId(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al buscar usuario en backend';
      console.error('❌ [useAuthNumericId] Error:', errorMessage);
      setError(errorMessage);
      setNumericUserId(0);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Ejecutar automáticamente cuando cambie el usuario
  useEffect(() => {
    if (user?.email) {
      fetchNumericUserId();
    } else {
      setNumericUserId(0);
      setError(null);
      setLoading(false);
    }
  }, [user?.email, fetchNumericUserId]);

  return {
    numericUserId,
    loading,
    error,
    refetch: fetchNumericUserId,
  };
};

/**
 * Hook simplificado que solo devuelve el ID numérico
 * Útil cuando solo necesitas el ID y no el estado de carga
 */
export const useAuthNumericIdSimple = (): number => {
  const { numericUserId } = useAuthNumericId();
  return numericUserId;
};