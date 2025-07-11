// src/app/products/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { ProductList } from '@/components/products/ProductList';

export const metadata: Metadata = {
  title: 'Productos - Chocorocks',
  description: 'Gestión de productos y categorías del inventario de Chocorocks',
};

export default function ProductsPage(): React.ReactElement {
  return <ProductList />;
}