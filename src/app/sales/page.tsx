// src/app/sales/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { SaleList } from '@/components/sales/SaleList';

export const metadata: Metadata = {
  title: 'Ventas - Chocorocks',
  description: 'Gestión de ventas y facturación del inventario de Chocorocks',
};

export default function SalesPage(): React.ReactElement {
  return <SaleList />;
}