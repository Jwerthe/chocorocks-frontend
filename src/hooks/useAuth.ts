// src/hooks/useAuth.ts (NUEVO)
import { useContext } from 'react';
import AuthContext from '@/contexts/AuthContext';
import { AuthContextType } from '@/types/auth';

/**
 * Hook personalizado para acceder al contexto de autenticación
 * Proporciona acceso a la información del usuario y funciones de autenticación
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  
  return context;
};

// ✅ NUEVO: Hook adicional para verificaciones rápidas de roles
interface UseAuthPermissionsReturn {
  isAdmin: boolean;
  isEmployee: boolean;
  canAccessReports: boolean;
  canAccessUsers: boolean;
  canDelete: boolean;
  hasRole: (role: 'ADMIN' | 'EMPLOYEE') => boolean;
  canAccessExecutiveReports: boolean;
}

export const useAuthPermissions = (): UseAuthPermissionsReturn => {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  
  return {
    isAdmin,
    isEmployee,
    canAccessReports: isAdmin || isEmployee,
    canAccessUsers: isAdmin, // Solo admin puede gestionar usuarios
    canDelete: isAdmin, // Solo admin puede eliminar
    canAccessExecutiveReports: isAdmin, // Solo admin puede ver reportes ejecutivos
    hasRole: (role: 'ADMIN' | 'EMPLOYEE') => user?.role === role,
  };
};

// ✅ NUEVO: Hook para proteger componentes basado en roles
interface UseRoleGuardOptions {
  requiredRole?: 'ADMIN' | 'EMPLOYEE';
  requireAuth?: boolean;
  fallbackComponent?: React.ComponentType;
}

interface UseRoleGuardReturn {
  canAccess: boolean;
  isLoading: boolean;
  user: AuthContextType['user'];
  redirectToLogin: () => void;
}

export const useRoleGuard = (options: UseRoleGuardOptions = {}): UseRoleGuardReturn => {
  const { user, loading } = useAuth();
  const { requiredRole, requireAuth = true } = options;
  
  let canAccess = true;
  
  // Si requiere autenticación y no hay usuario
  if (requireAuth && !user) {
    canAccess = false;
  }
  
  // Si se requiere un rol específico
  if (requiredRole && user && user.role !== requiredRole) {
    // Si requiere ADMIN pero es EMPLOYEE, no puede acceder
    if (requiredRole === 'ADMIN' && user.role === 'EMPLOYEE') {
      canAccess = false;
    }
  }
  
  const redirectToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };
  
  return {
    canAccess,
    isLoading: loading,
    user,
    redirectToLogin
  };
};