// src/components/inventory/InventoryMovementForm.tsx (CORREGIDO)
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

interface StockInfo {
  productStock: number; // Stock general del producto (minStockLevel)
  storeStock: number;   // Stock específico en tienda
  availableBatches: ProductBatchResponse[];
}

export const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  movementType = MovementType.OUT,
}) => {
  const { user } = useAuth();
  const { numericUserId, loading: loadingUserId, error: userError } = useAuthNumericId();

  // Estados principales
  const [formData, setFormData] = useState<InventoryMovementRequest>({
    movementType: movementType,
    productId: 0,
    batchId: undefined,
    fromStoreId: undefined,
    toStoreId: undefined,
    quantity: 0,
    reason: MovementReason.SALE,
    referenceId: undefined,
    referenceType: undefined,
    userId: 0,
    notes: '',
  });

  // Estados de datos
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [loadingStockInfo, setLoadingStockInfo] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  // Estados de opciones
  const [workWithBatch, setWorkWithBatch] = useState<boolean>(false);

  // ✅ FUNCIÓN CORREGIDA: Obtener información de stock real
  const fetchStockInfo = useCallback(async (
    productId: number, 
    fromStoreId?: number, 
    toStoreId?: number
  ): Promise<StockInfo | null> => {
    if (!productId) return null;
    
    setLoadingStockInfo(true);
    try {
      const [product, allBatches, allProductStores] = await Promise.all([
        productAPI.getProductById(productId),
        productBatchAPI.getAllBatches(),
        productStoreAPI.getAllProductStores()
      ]);

      // ✅ CORREGIDO: minStockLevel es el stock actual del producto
      const productStock = product.minStockLevel || 0;
      console.log(`📦 Stock del producto ${product.nameProduct}: ${productStock} unidades`);

      // Filtrar lotes del producto seleccionado que están activos y tienen stock
      const productBatches = allBatches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );

      console.log(`🏷️ Lotes disponibles: ${productBatches.length}`);

      // Obtener stock de la tienda específica
      let storeStock = productStock; // Por defecto usar stock general

      if (fromStoreId) {
        // Para salidas y transferencias, verificar stock en tienda origen
        const storeRelation = allProductStores.find(ps => 
          ps.product.id === productId && ps.store.id === fromStoreId
        );
        storeStock = storeRelation?.currentStock || 0;
        console.log(`🏪 Stock en tienda origen ${fromStoreId}: ${storeStock} unidades`);
      } else if (movementType === MovementType.OUT) {
        // Para salidas sin tienda específica, usar stock general
        storeStock = productStock;
      }

      return {
        productStock,
        storeStock,
        availableBatches: productBatches
      };
    } catch (err) {
      console.error('Error fetching stock info:', err);
      return null;
    } finally {
      setLoadingStockInfo(false);
    }
  }, [movementType]);

  const resetForm = useCallback((): void => {
    setFormData({
      movementType: movementType,
      productId: 0,
      batchId: undefined,
      fromStoreId: undefined,
      toStoreId: undefined,
      quantity: 0,
      reason: MovementReason.SALE,
      referenceId: undefined,
      referenceType: undefined,
      userId: numericUserId,
      notes: '',
    });
    
    setStockInfo(null);
    setErrors({});
    setError('');
    setValidationWarnings([]);
    setWorkWithBatch(false);
  }, [movementType, numericUserId]);

  const fetchInitialData = useCallback(async (): Promise<void> => {
    setLoadingStores(true);
    try {
      const [productsData, storesData] = await Promise.all([
        productAPI.getAllProducts(),
        storeAPI.getAllStores()
      ]);
      
      setProducts(productsData.filter(p => p.isActive));
      setStores(storesData.filter(s => s.isActive));
      console.log(`📋 Cargados: ${productsData.length} productos, ${storesData.length} tiendas`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos iniciales';
      setError(errorMessage);
    } finally {
      setLoadingStores(false);
    }
  }, []);

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

  // Actualizar información de stock cuando cambie el producto o tiendas
  useEffect(() => {
    if (formData.productId && formData.productId !== 0) {
      fetchStockInfo(formData.productId, formData.fromStoreId, formData.toStoreId)
        .then(setStockInfo);
    } else {
      setStockInfo(null);
    }
  }, [formData.productId, formData.fromStoreId, formData.toStoreId, fetchStockInfo]);

  // ✅ VALIDACIONES CORREGIDAS CON STOCK REAL
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

    // Validaciones específicas por tipo de movimiento
    if (formData.movementType === MovementType.TRANSFER) {
      if (!formData.fromStoreId) {
        newErrors.fromStoreId = 'La tienda origen es requerida para transferencias';
      }
      if (!formData.toStoreId) {
        newErrors.toStoreId = 'La tienda destino es requerida para transferencias';
      }
      if (formData.fromStoreId === formData.toStoreId) {
        newErrors.toStoreId = 'La tienda destino debe ser diferente a la tienda origen';
      }
    }

    // ✅ VALIDACIONES DE STOCK CRÍTICAS
    if (stockInfo && formData.productId && formData.quantity > 0) {
      console.log(`🔍 Validando movimiento: ${formData.movementType}, cantidad: ${formData.quantity}`);
      console.log(`📊 Stock disponible: general=${stockInfo.productStock}, tienda=${stockInfo.storeStock}`);

      switch (formData.movementType) {
        case MovementType.OUT:
          if (workWithBatch && formData.batchId) {
            // Validar lote específico
            const selectedBatch = stockInfo.availableBatches.find(b => b.id === formData.batchId);
            if (!selectedBatch) {
              newErrors.batchId = 'Lote no encontrado o sin stock';
            } else if (formData.quantity > selectedBatch.currentQuantity) {
              newErrors.quantity = `Solo hay ${selectedBatch.currentQuantity} unidades disponibles en este lote`;
            }
          } else {
            // Validar stock general o de tienda
            const availableStock = formData.fromStoreId ? stockInfo.storeStock : stockInfo.productStock;
            if (formData.quantity > availableStock) {
              newErrors.quantity = `Solo hay ${availableStock} unidades disponibles`;
            }
          }
          break;

        case MovementType.TRANSFER:
          if (workWithBatch && formData.batchId) {
            const selectedBatch = stockInfo.availableBatches.find(b => b.id === formData.batchId);
            if (!selectedBatch) {
              newErrors.batchId = 'Lote no encontrado';
            } else if (formData.quantity > selectedBatch.currentQuantity) {
              newErrors.quantity = `Solo hay ${selectedBatch.currentQuantity} unidades disponibles en el lote`;
            } else if (selectedBatch.store?.id !== formData.fromStoreId) {
              newErrors.batchId = 'El lote no se encuentra en la tienda origen seleccionada';
            }
          } else {
            if (formData.quantity > stockInfo.storeStock) {
              newErrors.quantity = `Solo hay ${stockInfo.storeStock} unidades disponibles en la tienda origen`;
            }
          }
          break;

        case MovementType.IN:
          // Para entradas, verificar límites razonables
          if (formData.quantity > 10000) {
            warnings.push('⚠️ La cantidad a ingresar es muy alta. Verifique que sea correcta.');
          }
          break;
      }

      // Advertencias adicionales
      if (stockInfo.productStock < 10 && formData.movementType === MovementType.OUT) {
        warnings.push('⚠️ Stock bajo del producto. Considere reabastecer pronto.');
      }

      if (stockInfo.availableBatches.length === 0 && workWithBatch) {
        warnings.push('📦 No hay lotes disponibles para este producto.');
      }

      // Verificar fechas de vencimiento cercanas
      const expiringSoon = stockInfo.availableBatches.filter(batch => {
        const daysUntilExpiration = Math.ceil(
          (new Date(batch.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
      });

      if (expiringSoon.length > 0) {
        warnings.push(`⏰ ${expiringSoon.length} lote(s) vencen en los próximos 30 días`);
      }
    }

    setErrors(newErrors);
    setValidationWarnings(warnings);
    
    console.log(`✅ Validación completada: ${Object.keys(newErrors).length} errores, ${warnings.length} advertencias`);
    
    return Object.keys(newErrors).length === 0;
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
        userId: numericUserId,
        batchId: workWithBatch ? formData.batchId : undefined
      };

      console.log('📤 Enviando movimiento de inventario:', movementData);

      await inventoryMovementAPI.createMovement(movementData);
      console.log('✅ Movimiento registrado exitosamente');
      
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar el movimiento';
      setError(errorMessage);
      console.error('❌ Error al crear movimiento:', err);
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
    setWorkWithBatch(false);
  };

  // Opciones para selects
  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map((product: ProductResponse) => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (Stock: ${product.minStockLevel || 0})` 
    }))
  ];

  const storeOptions: SelectOption[] = React.useMemo(() => {
    return createStoreOptions(stores, true, 'Seleccionar tienda...', true);
  }, [stores]);

  const batchOptions: SelectOption[] = stockInfo ? [
    { value: '', label: 'Seleccionar lote...' },
    ...stockInfo.availableBatches.map((batch: ProductBatchResponse) => ({ 
      value: batch.id.toString(), 
      label: `${batch.batchCode} (Disponible: ${batch.currentQuantity}) ${batch.store ? '- ' + batch.store.name : '- Bodega Central'}` 
    }))
  ] : [];

  const reasonOptions: SelectOption[] = createMovementReasonOptions();

  // Funciones de utilidad para UI
  const getMovementTitle = (): string => {
    switch (movementType) {
      case MovementType.IN: return 'Registrar Entrada de Inventario';
      case MovementType.OUT: return 'Registrar Salida de Inventario';
      case MovementType.TRANSFER: return 'Registrar Transferencia';
      default: return 'Registrar Movimiento';
    }
  };

  const getMovementDescription = (): string => {
    switch (movementType) {
      case MovementType.IN: return 'Registra el ingreso de productos al inventario';
      case MovementType.OUT: return 'Registra la salida de productos del inventario';
      case MovementType.TRANSFER: return 'Transfiere productos entre tiendas';
      default: return '';
    }
  };

  const isUserValid = numericUserId > 0 && !loadingUserId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getMovementTitle()}
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
          <p className="text-sm text-blue-700">{getMovementDescription()}</p>
          {user && numericUserId > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Usuario: {user.name} - ID Backend: {numericUserId}
            </p>
          )}
        </div>

        {/* ✅ INFORMACIÓN DE STOCK MEJORADA */}
        {stockInfo && formData.productId !== 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">📊 Información de Stock</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Stock General:</span>
                <div className="font-bold text-lg text-gray-800">{stockInfo.productStock} unidades</div>
              </div>
              <div>
                <span className="text-gray-600">
                  {formData.fromStoreId ? 'Stock en Tienda Origen:' : 'Stock Disponible:'}
                </span>
                <div className="font-bold text-lg text-gray-800">{stockInfo.storeStock} unidades</div>
              </div>
              <div>
                <span className="text-gray-600">Lotes Disponibles:</span>
                <div className="font-bold text-lg text-gray-800">{stockInfo.availableBatches.length} lotes</div>
              </div>
            </div>
            
            {stockInfo.availableBatches.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {stockInfo.availableBatches.slice(0, 3).map(batch => (
                    <Badge key={batch.id} variant="secondary" size="sm">
                      {batch.batchCode}: {batch.currentQuantity}
                    </Badge>
                  ))}
                  {stockInfo.availableBatches.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{stockInfo.availableBatches.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            )}
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
            disabled={loadingStockInfo}
          />

          {/* Cantidad */}
          <Input
            label="Cantidad*"
            type="number"
            min="1"
            max={stockInfo ? Math.max(stockInfo.productStock, stockInfo.storeStock, 10000) : 10000}
            value={formData.quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('quantity', parseInt(e.target.value) || 0)
            }
            error={errors.quantity}
            placeholder="Cantidad a mover"
            disabled={loadingStockInfo}
          />

          {/* Opción de trabajar con lotes */}
          {formData.productId !== 0 && stockInfo?.availableBatches.length > 0 && (
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={workWithBatch}
                  onChange={(e) => {
                    setWorkWithBatch(e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange('batchId', undefined);
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Trabajar con lote específico ({stockInfo.availableBatches.length} disponibles)
                </span>
              </label>
            </div>
          )}

          {/* Selector de lote (condicional) */}
          {workWithBatch && stockInfo?.availableBatches.length > 0 && (
            <div className="md:col-span-2">
              <Select
                label="Lote Específico*"
                value={formData.batchId?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('batchId', e.target.value ? parseInt(e.target.value) : undefined)
                }
                options={batchOptions}
                error={errors.batchId}
              />
            </div>
          )}

          {/* Motivo */}
          <Select
            label="Motivo*"
            value={formData.reason}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('reason', e.target.value as MovementReason)
            }
            options={reasonOptions}
            error={errors.reason}
          />

          {/* Selectores de tienda según tipo de movimiento */}
          {movementType === MovementType.TRANSFER && (
            <>
              <Select
                label="Tienda Origen*"
                value={formData.fromStoreId?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('fromStoreId', e.target.value ? parseInt(e.target.value) : undefined)
                }
                options={storeOptions}
                error={errors.fromStoreId}
                disabled={loadingStores}
              />

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
            </>
          )}

          {(movementType === MovementType.IN || movementType === MovementType.OUT) && (
            <Select
              label={movementType === MovementType.IN ? "Tienda Destino" : "Tienda Origen"}
              value={
                movementType === MovementType.IN 
                  ? formData.toStoreId?.toString() || ''
                  : formData.fromStoreId?.toString() || ''
              }
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const storeId = e.target.value ? parseInt(e.target.value) : undefined;
                if (movementType === MovementType.IN) {
                  handleInputChange('toStoreId', storeId);
                } else {
                  handleInputChange('fromStoreId', storeId);
                }
              }}
              options={[
                { value: '', label: 'Bodega Central' },
                ...storeOptions.filter(option => option.value !== '')
              ]}
              disabled={loadingStores}
            />
          )}

          {/* Notas */}
          <div className="md:col-span-2">
            <Input
              label="Notas"
              value={formData.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('notes', e.target.value)
              }
              error={errors.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        {/* Información del lote seleccionado */}
        {workWithBatch && formData.batchId && stockInfo?.availableBatches && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            {(() => {
              const selectedBatch = stockInfo.availableBatches.find(b => b.id === formData.batchId);
              if (selectedBatch) {
                return (
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">🏷️ Información del Lote</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-yellow-700">Código:</span> 
                        <span className="font-mono text-yellow-900 ml-2">{selectedBatch.batchCode}</span>
                      </div>
                      <div>
                        <span className="text-yellow-700">Disponible:</span> 
                        <span className="font-bold text-yellow-900 ml-2">{selectedBatch.currentQuantity} unidades</span>
                      </div>
                      <div>
                        <span className="text-yellow-700">Vencimiento:</span> 
                        <span className="ml-2 text-yellow-900">{new Date(selectedBatch.expirationDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-yellow-700">Ubicación:</span> 
                        <span className="ml-2 text-yellow-900">{selectedBatch.store?.name || 'Bodega Central'}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
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
            disabled={loadingStores || !isUserValid || loadingUserId || loadingStockInfo}
          >
            {loadingUserId ? 'Validando usuario...' : 
             loadingStores ? 'Cargando datos...' : 
             loadingStockInfo ? 'Verificando stock...' :
             'Registrar Movimiento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};