// src/app/clients/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { ClientList } from '@/components/clients/ClientList';

export const metadata: Metadata = {
  title: 'Clientes - Chocorocks',
  description: 'Gestión de clientes de Chocorocks',
};

export default function ClientsPage(): React.ReactElement {
  return <ClientList />;
}