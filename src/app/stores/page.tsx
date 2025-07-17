// src/app/stores/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { StoreList } from '@/components/stores/StoreList';

export const metadata: Metadata = {
  title: 'Tiendas - Chocorocks',
  description: 'Gestión de tiendas y puntos de venta de Chocorocks',
};

export default function StoresPage(): React.ReactElement {
  return <StoreList />;
}