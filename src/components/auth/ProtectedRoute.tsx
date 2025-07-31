'use client';

import React, { useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Props del componente
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'EMPLOYEE';
  fallbackPath?: string;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
}

// Componente de carga por defecto
const DefaultLoadingComponent: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-4 border-[#7ca1eb] border-t-transparent mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Verificando autenticación...</p>
    </div>
  </div>
);

// Componente de no autorizado por defecto
const DefaultUnauthorizedComponent: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="w-20 h-20 bg-red-500 border-4 border-black mx-auto mb-4 flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">No Autorizado</h1>
      <p className="text-gray-600 mb-6">
        No tienes permisos para acceder a esta página.
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-[#7ca1eb] border-2 border-black px-6 py-3 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200"
      >
        Volver
      </button>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallbackPath = '/login',
  loadingComponent = <DefaultLoadingComponent />,
  unauthorizedComponent = <DefaultUnauthorizedComponent />,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Verificación de autorización
  const checkAuthorization = useCallback((): 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated' => {
    if (loading) {
      return 'loading';
    }

    if (!user) {
      return 'unauthenticated';
    }

    // Si no se requiere un rol específico, cualquier usuario autenticado puede acceder
    if (!requiredRole) {
      return 'authorized';
    }

    // Los ADMIN pueden acceder a todo
    if (user.role === 'ADMIN') {
      return 'authorized';
    }

    // Verificar si el usuario tiene el rol requerido
    if (user.role === requiredRole) {
      return 'authorized';
    }

    return 'unauthorized';
  }, [user, loading, requiredRole]);

  // Efecto para manejar redirecciones
  useEffect(() => {
    const authStatus = checkAuthorization();

    if (authStatus === 'unauthenticated') {
      // Guardar la URL actual para redirigir después del login
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      
      router.push(fallbackPath);
      return;
    }

    if (authStatus === 'unauthorized') {
      // Para rutas no autorizadas, redirigir al dashboard
      router.push('/');
      return;
    }
  }, [checkAuthorization, router, fallbackPath]);

  // Renderizado condicional basado en el estado de autorización
  const authStatus = checkAuthorization();

  switch (authStatus) {
    case 'loading':
      return <>{loadingComponent}</>;
    
    case 'unauthenticated':
      return null; // Se está redirigiendo al login
    
    case 'unauthorized':
      return <>{unauthorizedComponent}</>;
    
    case 'authorized':
      return <>{children}</>;
    
    default:
      return null;
  }
};

// Hook personalizado para verificar permisos
export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = useCallback((role: 'ADMIN' | 'EMPLOYEE'): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === role;
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'ADMIN' || false;
  }, [user]);

  const isEmployee = useCallback((): boolean => {
    return user?.role === 'EMPLOYEE' || false;
  }, [user]);

  const canAccess = useCallback((requiredRole?: 'ADMIN' | 'EMPLOYEE'): boolean => {
    if (!user) return false;
    if (!requiredRole) return true;
    return hasRole(requiredRole);
  }, [user, hasRole]);

  return {
    user,
    hasRole,
    isAdmin,
    isEmployee,
    canAccess,
  };
};

// Componente de orden superior para proteger páginas
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'ADMIN' | 'EMPLOYEE'
) {
  const ProtectedComponent: React.FC<P> = (props) => {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  ProtectedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
}