// src/hooks/useInventoryStock.ts - Hook para obtener el stock real
import { useState, useCallback } from 'react';
import { 
  ProductResponse, 
  ProductStoreResponse, 
  ProductBatchResponse 
} from '@/types';
import { productAPI, productStoreAPI, productBatchAPI } from '@/services/api';

interface RealStockInfo {
  productId: number;
  totalStock: number; // Stock real total (suma de lotes activos)
  storeStocks: Array<{
    storeId: number;
    storeName: string;
    stock: number;
  }>;
  batchStocks: Array<{
    batchId: number;
    batchCode: string;
    stock: number;
    storeId?: number;
  }>;
  minStockLevel: number; // El nivel mínimo del producto
}

export const useInventoryStock = () => {
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Obtiene el stock REAL de un producto (suma de lotes activos)
   */
  const getRealProductStock = useCallback(async (productId: number): Promise<RealStockInfo> => {
    setLoading(true);
    try {
      const [product, productStores, allBatches] = await Promise.all([
        productAPI.getProductById(productId),
        productStoreAPI.getAllProductStores(),
        productBatchAPI.getAllBatches()
      ]);

      // Filtrar lotes activos del producto
      const productBatches = allBatches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );

      // Calcular stock total real (suma de lotes)
      const totalStock = productBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);

      // Stock por tienda
      const productStoreRelations = productStores.filter(ps => ps.product.id === productId);
      const storeStocks = productStoreRelations.map(ps => ({
        storeId: ps.store.id,
        storeName: ps.store.name,
        stock: ps.currentStock
      }));

      // Stock por lotes
      const batchStocks = productBatches.map(batch => ({
        batchId: batch.id,
        batchCode: batch.batchCode,
        stock: batch.currentQuantity,
        storeId: batch.store?.id
      }));

      return {
        productId,
        totalStock, // ✅ ESTE ES EL STOCK REAL
        storeStocks,
        batchStocks,
        minStockLevel: product.minStockLevel // Esto es solo el mínimo
      };
    } catch (error) {
      console.error('Error getting real stock:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getRealProductStock,
    loading
  };
};