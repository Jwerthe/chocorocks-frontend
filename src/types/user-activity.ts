// src/types/user-activity.ts - NUEVO ARCHIVO DE TIPOS
import { UserResponse } from './index';

// ✅ Interfaz que corresponde exactamente al DTO del backend
export interface UserActivityResponse {
  id: number;
  user: UserResponse;
  actionType: string;
  tableAffected?: string;
  recordId?: number;
  description: string;
  ipAddress?: string;
  userAgent?: string;
}

// ✅ Interfaz para crear nuevas actividades
export interface UserActivityRequest {
  userId: number; // Long en backend se convierte a number en TypeScript
  actionType: string;
  tableAffected?: string;
  recordId?: number;
  description: string;
  ipAddress?: string;
  userAgent?: string;
}

// ✅ Tipos para filtros en el frontend
export interface UserActivityFilters {
  userId: string;
  actionType: string;
  tableAffected: string;
}

// ✅ Enum para tipos de acción más comunes
export enum UserActivityAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE', 
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  PRINT = 'PRINT',
  EXPORT = 'EXPORT'
}

// ✅ Enum para tablas del sistema
export enum SystemTable {
  USERS = 'users',
  PRODUCTS = 'products',
  CATEGORIES = 'categories', 
  STORES = 'stores',
  CLIENTS = 'clients',
  SALES = 'sales',
  RECEIPTS = 'receipts',
  PRODUCT_BATCHES = 'product_batches',
  INVENTORY_MOVEMENTS = 'inventory_movements',
  PRODUCT_STORES = 'product_stores'
}

// ✅ Tipo para estadísticas de actividades
export interface ActivityStats {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
  others: number;
}

// ✅ Tipo para opciones de select
export interface SelectOption {
  value: string | number;
  label: string;
}

// ✅ Helper para obtener variante de badge según el tipo de acción
export const getActionTypeVariant = (actionType: string): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
  switch (actionType.toLowerCase()) {
    case 'create':
      return 'success';
    case 'update':
      return 'warning';
    case 'delete':
      return 'danger';
    case 'login':
      return 'primary';
    case 'logout':
      return 'secondary';
    default:
      return 'secondary';
  }
};

// ✅ Helper para traducir nombres de tablas
export const getTableDisplayName = (tableAffected: string | undefined): string => {
  if (!tableAffected) return 'N/A';
  
  const tableNames: Record<string, string> = {
    'users': 'Usuarios',
    'products': 'Productos', 
    'categories': 'Categorías',
    'stores': 'Tiendas',
    'clients': 'Clientes',
    'sales': 'Ventas',
    'receipts': 'Recibos',
    'product_batches': 'Lotes de Productos',
    'inventory_movements': 'Movimientos de Inventario',
    'product_stores': 'Stock por Tienda'
  };

  return tableNames[tableAffected] || tableAffected;
};

// ✅ Helper para calcular estadísticas
export const calculateActivityStats = (activities: UserActivityResponse[]): ActivityStats => {
  const stats = activities.reduce(
    (acc, activity) => {
      acc.total++;
      switch (activity.actionType.toLowerCase()) {
        case 'create':
          acc.creates++;
          break;
        case 'update':
          acc.updates++;
          break;
        case 'delete':
          acc.deletes++;
          break;
        default:
          acc.others++;
      }
      return acc;
    },
    { total: 0, creates: 0, updates: 0, deletes: 0, others: 0 }
  );

  return stats;
};