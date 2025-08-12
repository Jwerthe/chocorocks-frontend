// src/utils/movement-translations.ts

import { MovementType, MovementReason, StoreType } from '@/types';

// ✅ TRADUCCIONES PARA MOTIVOS DE MOVIMIENTO
export const MOVEMENT_REASON_TRANSLATIONS: Record<MovementReason, string> = {
  [MovementReason.PRODUCTION]: 'Producción',
  [MovementReason.SALE]: 'Venta',
  [MovementReason.TRANSFER]: 'Transferencia',
  [MovementReason.ADJUSTMENT]: 'Ajuste de Inventario',
  [MovementReason.DAMAGE]: 'Producto Dañado',
  [MovementReason.EXPIRED]: 'Producto Vencido',
};

// ✅ TRADUCCIONES PARA TIPOS DE MOVIMIENTO
export const MOVEMENT_TYPE_TRANSLATIONS: Record<MovementType, string> = {
  [MovementType.IN]: 'Entrada',
  [MovementType.OUT]: 'Salida',
  [MovementType.TRANSFER]: 'Transferencia',
};

// ✅ TRADUCCIONES PARA TIPOS DE TIENDA
export const STORE_TYPE_TRANSLATIONS: Record<StoreType, string> = {
  [StoreType.FISICA]: 'Tienda Física',
  [StoreType.MOVIL]: 'Tienda Móvil',
  [StoreType.BODEGA]: 'Bodega',
};

// ✅ UTILIDADES PARA CREAR OPTIONS DE SELECT

interface SelectOption {
  value: string | number;
  label: string;
}

export const createMovementReasonOptions = (): SelectOption[] => {
  return Object.values(MovementReason).map((reason: MovementReason) => ({
    value: reason, // Backend espera en inglés
    label: MOVEMENT_REASON_TRANSLATIONS[reason] // UI en español
  }));
};

export const createMovementTypeOptions = (): SelectOption[] => {
  return Object.values(MovementType).map((type: MovementType) => ({
    value: type,
    label: MOVEMENT_TYPE_TRANSLATIONS[type]
  }));
};

export const createStoreTypeOptions = (): SelectOption[] => {
  return Object.values(StoreType).map((type: StoreType) => ({
    value: type,
    label: STORE_TYPE_TRANSLATIONS[type]
  }));
};

// ✅ FUNCIÓN PARA OBTENER TRADUCCIÓN INDIVIDUAL
export const translateMovementReason = (reason: MovementReason): string => {
  return MOVEMENT_REASON_TRANSLATIONS[reason] || reason;
};

export const translateMovementType = (type: MovementType): string => {
  return MOVEMENT_TYPE_TRANSLATIONS[type] || type;
};

export const translateStoreType = (type: StoreType): string => {
  return STORE_TYPE_TRANSLATIONS[type] || type;
};

// ✅ FUNCIÓN PARA DEBUGGING DE STORES
export const debugStores = (stores: any[], context: string = 'Unknown'): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🏪 [${context}] Store Debug Info`);
    console.log('📊 Total stores:', stores.length);
    console.log('✅ Active stores:', stores.filter(s => s.isActive).length);
    console.log('❌ Inactive stores:', stores.filter(s => !s.isActive).length);
    console.log('📋 Store names:', stores.map(s => s.name));
    console.table(stores.map(s => ({
      id: s.id,
      name: s.name,
      type: s.typeStore,
      active: s.isActive
    })));
    console.groupEnd();
  }
};

// ✅ FUNCIÓN HELPER PARA CREAR OPTIONS DE TIENDAS
export const createStoreOptions = (
  stores: any[], 
  includeEmpty: boolean = true,
  emptyLabel: string = 'Seleccionar tienda...',
  activeOnly: boolean = true
): SelectOption[] => {
  const options: SelectOption[] = [];
  
  if (includeEmpty) {
    options.push({ value: '', label: emptyLabel });
  }
  
  const filteredStores = activeOnly 
    ? stores.filter(store => store.isActive)
    : stores;
  
  const storeOptions = filteredStores.map(store => ({
    value: store.id.toString(),
    label: store.name
  }));
  
  return [...options, ...storeOptions];
};