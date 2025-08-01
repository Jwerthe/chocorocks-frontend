// src/app/sales/page.tsx
'use client';

import React from 'react';
import { SaleList } from '@/components/sales/SaleList';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/ui/Alert';

export default function SalesPage(): React.ReactElement {
  const { user, loading } = useAuth();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
      </div>
    );
  }

  // Verificar que el usuario esté autenticado
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="warning">
          Debes iniciar sesión para acceder a las ventas.
        </Alert>
      </div>
    );
  }

  return <SaleList />;
}