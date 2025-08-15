// src/components/inventory/InventoryMovementForm.tsx (CORREGIDO - LÓGICA DE LOTES)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  InventoryMovementRequest, 
  ProductResponse, 
  StoreResponse, 
  ProductBatchResponse,
  ProductStoreRequest,
  ProductStoreResponse,
  MovementType,
  MovementReason 
} from '@/types';
import { 
  inventoryMovementAPI, 
  productAPI, 
  storeAPI, 
  productBatchAPI,
  productStoreAPI,
  ApiError 
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthNumericId } from '@/hooks/useAuthNumericId';
import { 
  createMovementReasonOptions,
  createStoreOptions 
} from '@/utils/movement-translations';

interface InventoryMovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  movementType?: MovementType;
}

interface FormErrors {
  [key: string]: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface BatchStockInfo {
  batch: ProductBatchResponse;
  availableStock: number;
}

export const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  movementType = MovementType.TRANSFER, // ✅ Solo TRANSFER por ahora
}) => {
  const { user } = useAuth();
  const { numericUserId, loading: loadingUserId, error: userError } = useAuthNumericId();

  // Estados principales
  const [formData, setFormData] = useState<InventoryMovementRequest>({
    movementType: MovementType.TRANSFER,
    productId: 0,
    batchId: undefined,
    fromStoreId: undefined,
    toStoreId: undefined,
    quantity: 0,
    reason: MovementReason.TRANSFER,
    referenceId: undefined,
    referenceType: undefined,
    userId: numericUserId?.toString() || '0',
    notes: '',
  });

  // Estados de datos
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchStockInfo[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchResponse | null>(null);
  const [existingProductStores, setExistingProductStores] = useState<ProductStoreResponse[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // ✅ NUEVA FUNCIÓN: Obtener lotes disponibles basado en stock real
  const fetchAvailableBatches = useCallback(async (
    productId: number, 
    fromStoreId?: number
  ): Promise<void> => {
    if (!productId) {
      setAvailableBatches([]);
      return;
    }
    
    setLoadingBatches(true);
    try {
      const allBatches = await productBatchAPI.getAllBatches();
      
      // Filtrar lotes del producto que estén activos y tengan stock
      const productBatches = allBatches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );

      // Si hay tienda origen especificada, filtrar por esa tienda
      const filteredBatches = fromStoreId 
        ? productBatches.filter(batch => batch.store?.id === fromStoreId)
        : productBatches;

      const batchStockInfo: BatchStockInfo[] = filteredBatches.map(batch => ({
        batch,
        availableStock: batch.currentQuantity // ✅ Usar stock real del lote
      }));

      setAvailableBatches(batchStockInfo);
      console.log(`📦 Lotes disponibles: ${batchStockInfo.length}`);
      batchStockInfo.forEach(info => {
        console.log(`  - ${info.batch.batchCode}: ${info.availableStock} disponibles`);
      });
      
    } catch (err) {
      console.error('Error fetching batches:', err);
      setAvailableBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const fetchExistingProductStores = useCallback(async (): Promise<void> => {
    try {
      const data = await productStoreAPI.getAllProductStores();
      setExistingProductStores(data);
    } catch (err) {
      console.error('Error fetching product stores:', err);
    }
  }, []);

  const resetForm = useCallback((): void => {
    setFormData({
      movementType: MovementType.TRANSFER,
      productId: 0,
      batchId: undefined,
      fromStoreId: undefined,
      toStoreId: undefined,
      quantity: 0,
      reason: MovementReason.TRANSFER,
      referenceId: undefined,
      referenceType: undefined,
      userId: numericUserId?.toString() || '0',
      notes: '',
    });
    
    setAvailableBatches([]);
    setSelectedBatch(null);
    setErrors({});
    setError('');
    setValidationWarnings([]);
  }, [numericUserId]);

  const fetchInitialData = useCallback(async (): Promise<void> => {
    setLoadingStores(true);
    try {
      const [productsData, storesData] = await Promise.all([
        productAPI.getAllProducts(),
        storeAPI.getAllStores()
      ]);
      
      setProducts(productsData.filter(p => p.isActive));
      setStores(storesData.filter(s => s.isActive));
      await fetchExistingProductStores();
      
      console.log(`📋 Cargados: ${productsData.length} productos, ${storesData.length} tiendas`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos iniciales';
      setError(errorMessage);
    } finally {
      setLoadingStores(false);
    }
  }, [fetchExistingProductStores]);

  // Efectos
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen, fetchInitialData]);

  useEffect(() => {
    if (numericUserId > 0) {
      resetForm();
    }
  }, [numericUserId, resetForm]);

  // Actualizar lotes disponibles cuando cambie el producto o tienda origen
  useEffect(() => {
    if (formData.productId && formData.productId !== 0) {
      fetchAvailableBatches(formData.productId, formData.fromStoreId);
    } else {
      setAvailableBatches([]);
    }
  }, [formData.productId, formData.fromStoreId, fetchAvailableBatches]);

  // ✅ VALIDACIONES CORREGIDAS: Basadas en stock real de lotes
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const warnings: string[] = [];

    // Validación básica de usuario
    if (!numericUserId || numericUserId === 0) {
      newErrors.general = 'Error: No se pudo obtener la información del usuario.';
    }

    // Validación de producto
    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    // Validación de cantidad
    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    // Validaciones de tiendas para transferencia
    if (!formData.fromStoreId) {
      newErrors.fromStoreId = 'La tienda origen es requerida';
    }
    if (!formData.toStoreId) {
      newErrors.toStoreId = 'La tienda destino es requerida';
    }
    if (formData.fromStoreId === formData.toStoreId) {
      newErrors.toStoreId = 'La tienda destino debe ser diferente a la tienda origen';
    }

    // Validación de lote
    if (!formData.batchId) {
      newErrors.batchId = 'El lote es requerido para transferencias';
    }

    // ✅ VALIDACIÓN CRÍTICA: Stock del lote seleccionado
    if (formData.batchId && selectedBatch && formData.quantity > 0) {
      const availableStock = selectedBatch.currentQuantity;
      
      if (formData.quantity > availableStock) {
        newErrors.quantity = `Solo hay ${availableStock} unidades disponibles en el lote ${selectedBatch.batchCode}`;
      }

      // Verificar que el lote esté en la tienda origen
      if (formData.fromStoreId && selectedBatch.store?.id !== formData.fromStoreId) {
        newErrors.batchId = `El lote ${selectedBatch.batchCode} no se encuentra en la tienda origen seleccionada`;
      }

      // Advertencias
      const daysUntilExpiration = Math.ceil(
        (new Date(selectedBatch.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
        warnings.push(`⏰ El lote ${selectedBatch.batchCode} vence en ${daysUntilExpiration} días`);
      } else if (daysUntilExpiration <= 0) {
        newErrors.batchId = `El lote ${selectedBatch.batchCode} ya ha vencido`;
      }

      if (formData.quantity === availableStock) {
        warnings.push(`📦 Se transferirá todo el stock disponible del lote ${selectedBatch.batchCode}`);
      }
    }

    setErrors(newErrors);
    setValidationWarnings(warnings);
    
    console.log(`✅ Validación completada: ${Object.keys(newErrors).length} errores, ${warnings.length} advertencias`);
    
    return Object.keys(newErrors).length === 0;
  };

  // ✅ NUEVA FUNCIÓN: Actualizar ProductStore tras transferencia
  const updateProductStoreAfterTransfer = async (
    productId: number,
    toStoreId: number,
    transferredQuantity: number
  ): Promise<void> => {
    try {
      // Buscar si ya existe relación ProductStore para la tienda destino
      const existingRelation = existingProductStores.find(ps => 
        ps.product.id === productId && ps.store.id === toStoreId
      );

      if (existingRelation) {
        // Actualizar stock existente
        const updateData: ProductStoreRequest = {
          productId: productId,
          storeId: toStoreId,
          currentStock: existingRelation.currentStock + transferredQuantity,
          minStockLevel: existingRelation.minStockLevel
        };
        
        await productStoreAPI.updateProductStore(existingRelation.id, updateData);
        console.log(`✅ Stock actualizado en tienda destino: +${transferredQuantity} unidades`);
      } else {
        // Crear nueva relación ProductStore
        const createData: ProductStoreRequest = {
          productId: productId,
          storeId: toStoreId,
          currentStock: transferredQuantity,
          minStockLevel: 0 // Default
        };
        
        await productStoreAPI.createProductStore(createData);
        console.log(`✅ Nueva relación ProductStore creada con ${transferredQuantity} unidades`);
      }
    } catch (err) {
      console.error('Error updating ProductStore:', err);
      throw new Error('Error al actualizar el stock en la tienda destino');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!numericUserId || numericUserId === 0) {
        throw new Error('No se pudo obtener el ID del usuario.');
      }

      const movementData: InventoryMovementRequest = {
        ...formData,
        userId: numericUserId?.toString() || '0',
        movementType: MovementType.TRANSFER,
        reason: MovementReason.TRANSFER
      };

      console.log('📤 Enviando transferencia:', movementData);

      // 1. Registrar el movimiento de inventario
      await inventoryMovementAPI.createMovement(movementData);
      console.log('✅ Movimiento registrado exitosamente');
      
      // 2. Actualizar ProductStore en tienda destino
      if (formData.toStoreId) {
        await updateProductStoreAfterTransfer(
          formData.productId,
          formData.toStoreId,
          formData.quantity
        );
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar la transferencia';
      setError(errorMessage);
      console.error('❌ Error al crear transferencia:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manejadores de cambios
  const handleInputChange = (
    field: keyof InventoryMovementRequest, 
    value: any
  ): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const productId = parseInt(e.target.value) || 0;
    handleInputChange('productId', productId);
    handleInputChange('batchId', undefined);
    setSelectedBatch(null);
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const batchId = parseInt(e.target.value) || undefined;
    handleInputChange('batchId', batchId);
    
    if (batchId) {
      const batchInfo = availableBatches.find(info => info.batch.id === batchId);
      setSelectedBatch(batchInfo?.batch || null);
    } else {
      setSelectedBatch(null);
    }
  };

  // Opciones para selects
  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map((product: ProductResponse) => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'}` 
    }))
  ];

  const storeOptions: SelectOption[] = React.useMemo(() => {
    return createStoreOptions(stores, true, 'Seleccionar tienda...', true);
  }, [stores]);

  const batchOptions: SelectOption[] = [
    { value: '', label: 'Seleccionar lote...' },
    ...availableBatches.map((info: BatchStockInfo) => ({ 
      value: info.batch.id.toString(), 
      label: `${info.batch.batchCode} (Disponible: ${info.availableStock}) - ${info.batch.store?.name || 'Bodega Central'}` 
    }))
  ];

  const reasonOptions: SelectOption[] = createMovementReasonOptions();

  const isUserValid = numericUserId > 0 && !loadingUserId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Transferencia entre Tiendas"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alertas de errores */}
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
        {errors.general && <Alert variant="error">{errors.general}</Alert>}
        {userError && <Alert variant="error">{userError}</Alert>}
        
        {/* Alertas de estado del usuario */}
        {!isUserValid && loadingUserId && (
          <Alert variant="warning">⚠️ Cargando información del usuario...</Alert>
        )}
        {!isUserValid && !loadingUserId && (
          <Alert variant="error">❌ No se pudo cargar la información del usuario.</Alert>
        )}

        {/* Advertencias de validación */}
        {validationWarnings.length > 0 && (
          <Alert variant="warning">
            <div className="space-y-1">
              {validationWarnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </Alert>
        )}
        
        {/* Información del contexto */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm text-blue-700">
            Transfiere productos de un lote específico entre tiendas
          </p>
          {user && numericUserId > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Usuario: {user.name} - ID Backend: {numericUserId}
            </p>
          )}
        </div>

        {/* ✅ INFORMACIÓN DE LOTE SELECCIONADO */}
        {selectedBatch && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">🏷️ Información del Lote Seleccionado</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-700">Código:</span>
                <div className="font-mono text-green-900 font-bold">{selectedBatch.batchCode}</div>
              </div>
              <div>
                <span className="text-green-700">Stock Disponible:</span>
                <div className="font-bold text-lg text-green-900">{selectedBatch.currentQuantity} unidades</div>
              </div>
              <div>
                <span className="text-green-700">Vencimiento:</span>
                <div className="text-green-900">{new Date(selectedBatch.expirationDate).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-green-700">Ubicación Actual:</span>
                <div className="text-green-900">{selectedBatch.store?.name || 'Bodega Central'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de producto */}
          <Select
            label="Producto*"
            value={formData.productId}
            onChange={handleProductChange}
            options={productOptions}
            error={errors.productId}
            disabled={loadingBatches}
          />

          {/* Tienda origen */}
          <Select
            label="Tienda Origen*"
            value={formData.fromStoreId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const storeId = e.target.value ? parseInt(e.target.value) : undefined;
              handleInputChange('fromStoreId', storeId);
              // Reset batch cuando cambia tienda origen
              handleInputChange('batchId', undefined);
              setSelectedBatch(null);
            }}
            options={storeOptions}
            error={errors.fromStoreId}
            disabled={loadingStores}
          />

          {/* Tienda destino */}
          <Select
            label="Tienda Destino*"
            value={formData.toStoreId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('toStoreId', e.target.value ? parseInt(e.target.value) : undefined)
            }
            options={storeOptions}
            error={errors.toStoreId}
            disabled={loadingStores}
          />

          {/* Selector de lote */}
          {formData.productId !== 0 && (
            <Select
              label="Lote Específico*"
              value={formData.batchId?.toString() || ''}
              onChange={handleBatchChange}
              options={batchOptions}
              error={errors.batchId}
              disabled={loadingBatches || availableBatches.length === 0}
            />
          )}

          {/* Cantidad */}
          <Input
            label="Cantidad a Transferir*"
            type="number"
            min="1"
            max={selectedBatch?.currentQuantity || 1000}
            value={formData.quantity || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('quantity', parseInt(e.target.value) || 0)
            }
            error={errors.quantity}
            placeholder="Cantidad a transferir"
            disabled={!selectedBatch}
          />

          {/* Notas */}
          <div className="md:col-span-2">
            <Input
              label="Notas"
              value={formData.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('notes', e.target.value)
              }
              error={errors.notes}
              placeholder="Observaciones adicionales sobre la transferencia..."
            />
          </div>
        </div>

        {/* Estado de carga de lotes */}
        {loadingBatches && formData.productId !== 0 && (
          <div className="text-center text-gray-500 py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#7ca1eb] border-t-transparent mx-auto mb-2" />
            Cargando lotes disponibles...
          </div>
        )}

        {/* Sin lotes disponibles */}
        {!loadingBatches && formData.productId !== 0 && availableBatches.length === 0 && (
          <Alert variant="warning">
            ⚠️ No hay lotes disponibles para este producto en la tienda origen seleccionada.
          </Alert>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loadingStores || !isUserValid || loadingUserId || loadingBatches || !selectedBatch}
          >
            {loadingUserId ? 'Validando usuario...' : 
             loadingStores ? 'Cargando datos...' : 
             loadingBatches ? 'Verificando lotes...' :
             'Registrar Transferencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};