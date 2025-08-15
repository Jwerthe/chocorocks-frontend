// src/components/inventory/InventoryMovementForm.tsx
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
  productStock: number;
  storeStock: number;
  batchStock: number;
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
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);
  const [productStores, setProductStores] = useState<ProductStoreResponse[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [loadingStockInfo, setLoadingStockInfo] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  
  // Estados de opciones
  const [workWithBatch, setWorkWithBatch] = useState<boolean>(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Función para obtener información de stock
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

      // Stock general del producto (usando minStockLevel como stock actual según el código actual)
      const productStock = product.minStockLevel || 0;

      // Filtrar lotes del producto seleccionado
      const productBatches = allBatches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );

      // Obtener stock de la tienda específica
      let storeStock = 0;
      let batchStock = 0;

      if (fromStoreId) {
        // Para salidas y transferencias, verificar stock en tienda origen
        const storeRelation = allProductStores.find(ps => 
          ps.product.id === productId && ps.store.id === fromStoreId
        );
        storeStock = storeRelation?.currentStock || 0;

        // Stock de lotes en la tienda específica
        const storeBatches = productBatches.filter(batch => 
          batch.store?.id === fromStoreId
        );
        batchStock = storeBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
      } else {
        // Para entradas, usar stock general
        storeStock = productStock;
        batchStock = productBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
      }

      return {
        productStock,
        storeStock,
        batchStock,
        availableBatches: productBatches
      };
    } catch (err) {
      console.error('Error fetching stock info:', err);
      return null;
    } finally {
      setLoadingStockInfo(false);
    }
  }, []);

  // Resetear formulario
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
    
    setBatches([]);
    setStockInfo(null);
    setErrors({});
    setError('');
    setValidationWarnings([]);
    setWorkWithBatch(false);
  }, [movementType, numericUserId]);

  // Cargar datos iniciales
  const fetchInitialData = useCallback(async (): Promise<void> => {
    setLoadingStores(true);
    try {
      const [productsData, storesData, productStoresData] = await Promise.all([
        productAPI.getAllProducts(),
        storeAPI.getAllStores(),
        productStoreAPI.getAllProductStores()
      ]);
      
      setProducts(productsData.filter(p => p.isActive));
      setStores(storesData.filter(s => s.isActive));
      setProductStores(productStoresData);
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

  // Validaciones avanzadas
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

    // Validaciones de stock si tenemos información disponible
    if (stockInfo && formData.productId && formData.quantity > 0) {
      switch (formData.movementType) {
        case MovementType.OUT:
          if (workWithBatch && formData.batchId) {
            const selectedBatch = stockInfo.availableBatches.find(b => b.id === formData.batchId);
            if (selectedBatch && formData.quantity > selectedBatch.currentQuantity) {
              newErrors.quantity = `Solo hay ${selectedBatch.currentQuantity} unidades disponibles en este lote`;
            }
          } else {
            if (formData.quantity > stockInfo.storeStock) {
              newErrors.quantity = `Solo hay ${stockInfo.storeStock} unidades disponibles`;
            }
          }
          break;

        case MovementType.TRANSFER:
          if (workWithBatch && formData.batchId) {
            const selectedBatch = stockInfo.availableBatches.find(b => b.id === formData.batchId);
            if (selectedBatch && formData.quantity > selectedBatch.currentQuantity) {
              newErrors.quantity = `Solo hay ${selectedBatch.currentQuantity} unidades disponibles en este lote`;
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
            warnings.push('La cantidad a ingresar es muy alta. Verifique que sea correcta.');
          }
          break;
      }

      // Advertencias adicionales
      if (stockInfo.productStock < 10 && formData.movementType === MovementType.OUT) {
        warnings.push('⚠️ Stock bajo del producto. Considere reabastecer pronto.');
      }

      if (stockInfo.availableBatches.length === 0 && workWithBatch) {
        warnings.push('No hay lotes disponibles para este producto.');
      }
    }

    setErrors(newErrors);
    setValidationWarnings(warnings);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
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

      await inventoryMovementAPI.createMovement(movementData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar el movimiento';
      setError(errorMessage);
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
    setBatches([]);
    setWorkWithBatch(false);
  };

  // Opciones para selects
  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map((product: ProductResponse) => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (${product.size || 'Sin tamaño'})` 
    }))
  ];

  const storeOptions: SelectOption[] = React.useMemo(() => {
    return createStoreOptions(stores, true, 'Seleccionar tienda...', true);
  }, [stores]);

  const batchOptions: SelectOption[] = stockInfo ? [
    { value: '', label: 'Seleccionar lote...' },
    ...stockInfo.availableBatches.map((batch: ProductBatchResponse) => ({ 
      value: batch.id.toString(), 
      label: `${batch.batchCode} (Disponible: ${batch.currentQuantity})` 
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

        {/* Información de stock */}
        {stockInfo && formData.productId !== 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">📊 Información de Stock</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Stock General:</span>
                <div className="font-bold text-lg text-gray-800">{stockInfo.productStock} unidades</div>
              </div>
              <div>
                <span className="text-gray-600">Stock en Tienda:</span>
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

// ================================
// Improved ProductBatchForm with stock updates
// ================================

interface ImprovedProductBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBatch?: ProductBatchResponse | null;
}

export const ImprovedProductBatchForm: React.FC<ImprovedProductBatchFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingBatch,
}) => {
  const [formData, setFormData] = useState<ProductBatchRequest>({
    batchCode: '',
    productId: 0,
    productionDate: '',
    expirationDate: '',
    initialQuantity: 0,
    currentQuantity: 0,
    batchCost: 0,
    storeId: undefined,
    isActive: true,
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  // Función para actualizar stock del producto
  const updateProductStock = async (
    productId: number, 
    quantity: number, 
    operation: 'subtract' | 'add'
  ): Promise<void> => {
    try {
      const product = await productAPI.getProductById(productId);
      const currentStock = product.minStockLevel || 0; // Usando minStockLevel como stock actual
      
      let newStock: number;
      if (operation === 'subtract') {
        newStock = Math.max(0, currentStock - quantity);
      } else {
        newStock = currentStock + quantity;
      }

      // Actualizar el producto con el nuevo stock
      const updateData = {
        ...product,
        minStockLevel: newStock, // Actualizar el stock
        categoryId: product.category.id // Necesario para la API
      };

      await productAPI.updateProduct(productId, updateData);
    } catch (err) {
      console.error('Error updating product stock:', err);
      throw new Error('Error al actualizar el stock del producto');
    }
  };

  // Función para crear/actualizar productStore si se asigna a tienda
  const updateProductStoreRelation = async (
    productId: number,
    storeId: number,
    quantity: number
  ): Promise<void> => {
    try {
      const allProductStores = await productStoreAPI.getAllProductStores();
      const existingRelation = allProductStores.find(ps => 
        ps.product.id === productId && ps.store.id === storeId
      );

      if (existingRelation) {
        // Actualizar relación existente
        const updateData = {
          productId: productId,
          storeId: storeId,
          currentStock: existingRelation.currentStock + quantity,
          minStockLevel: existingRelation.minStockLevel
        };
        await productStoreAPI.updateProductStore(existingRelation.id, updateData);
      } else {
        // Crear nueva relación
        const newRelation = {
          productId: productId,
          storeId: storeId,
          currentStock: quantity,
          minStockLevel: 5 // Valor por defecto
        };
        await productStoreAPI.createProductStore(newRelation);
      }
    } catch (err) {
      console.error('Error updating product-store relation:', err);
      throw new Error('Error al actualizar la relación producto-tienda');
    }
  };

  const validateStockOperation = (): boolean => {
    if (!selectedProduct || !formData.initialQuantity) return true;
    
    const warnings: string[] = [];
    const currentStock = selectedProduct.minStockLevel || 0;
    
    if (formData.initialQuantity > currentStock) {
      warnings.push(`⚠️ La cantidad del lote (${formData.initialQuantity}) es mayor al stock disponible (${currentStock}). Esto dejará el producto en negativo.`);
    }
    
    if (currentStock - formData.initialQuantity < 10) {
      warnings.push(`⚠️ Después de crear este lote, el stock quedará muy bajo (${currentStock - formData.initialQuantity} unidades).`);
    }

    setStockWarnings(warnings);
    return true; // Permitir la operación pero con advertencias
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = { ...formData };
      if (!editingBatch) {
        submitData.currentQuantity = submitData.initialQuantity;
      }

      let savedBatch: ProductBatchResponse;
      
      if (editingBatch) {
        savedBatch = await productBatchAPI.updateBatch(editingBatch.id, submitData);
      } else {
        // Crear nuevo lote
        savedBatch = await productBatchAPI.createBatch(submitData);
        
        // ✅ NUEVA FUNCIONALIDAD: Actualizar stock del producto
        await updateProductStock(formData.productId, formData.initialQuantity, 'subtract');
        
        // ✅ NUEVA FUNCIONALIDAD: Si se asigna a una tienda, actualizar ProductStore
        if (formData.storeId) {
          await updateProductStoreRelation(formData.productId, formData.storeId, formData.initialQuantity);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 
        (editingBatch ? 'Error al actualizar el lote' : 'Error al crear el lote');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const productId = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, productId }));
    
    if (productId !== 0) {
      try {
        const product = await productAPI.getProductById(productId);
        setSelectedProduct(product);
      } catch (err) {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }
  };

  // Validar cuando cambie la cantidad
  useEffect(() => {
    if (selectedProduct && formData.initialQuantity > 0) {
      validateStockOperation();
    } else {
      setStockWarnings([]);
    }
  }, [selectedProduct, formData.initialQuantity]);

  const generateBatchCode = useCallback((): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `LOTE-${year}${month}${day}-${random}`;
  }, []);

  const resetForm = useCallback((): void => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      batchCode: generateBatchCode(),
      productId: 0,
      productionDate: today,
      expirationDate: '',
      initialQuantity: 0,
      currentQuantity: 0,
      batchCost: 0,
      storeId: undefined,
      isActive: true,
    });
    setErrors({});
    setError('');
    setStockWarnings([]);
    setSelectedProduct(null);
  }, [generateBatchCode]);

  const fetchInitialData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [productsData, storesData] = await Promise.all([
        productAPI.getAllProducts(),
        storeAPI.getAllStores()
      ]);
      
      setProducts(productsData.filter(p => p.isActive));
      setStores(storesData.filter(s => s.isActive));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Error al cargar datos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.batchCode.trim()) {
      newErrors.batchCode = 'El código del lote es requerido';
    }

    if (!formData.productId || formData.productId === 0) {
      newErrors.productId = 'El producto es requerido';
    }

    if (!formData.productionDate) {
      newErrors.productionDate = 'La fecha de producción es requerida';
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = 'La fecha de vencimiento es requerida';
    } else if (formData.productionDate) {
      const productionDate = new Date(formData.productionDate);
      const expirationDate = new Date(formData.expirationDate);
      
      if (expirationDate <= productionDate) {
        newErrors.expirationDate = 'La fecha de vencimiento debe ser posterior a la producción';
      }
    }

    if (formData.initialQuantity <= 0) {
      newErrors.initialQuantity = 'La cantidad inicial debe ser mayor a 0';
    }

    if (formData.batchCost < 0) {
      newErrors.batchCost = 'El costo del lote no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProductBatchRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (editingBatch) {
        setFormData({
          batchCode: editingBatch.batchCode,
          productId: editingBatch.product.id,
          productionDate: editingBatch.productionDate,
          expirationDate: editingBatch.expirationDate,
          initialQuantity: editingBatch.initialQuantity,
          currentQuantity: editingBatch.currentQuantity,
          batchCost: editingBatch.batchCost,
          storeId: editingBatch.store?.id,
          isActive: editingBatch.isActive,
        });
        // Cargar información del producto
        productAPI.getProductById(editingBatch.product.id).then(setSelectedProduct);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingBatch, fetchInitialData, resetForm]);

  const productOptions = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map(product => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (${product.size || 'Sin tamaño'})` 
    }))
  ];

  const storeOptions = [
    { value: '', label: 'Sin asignar' },
    ...stores.map(store => ({ value: store.id.toString(), label: store.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBatch ? 'Editar Lote de Producción' : 'Registrar Nuevo Lote'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
        
        {/* Mostrar advertencias de stock */}
        {stockWarnings.length > 0 && (
          <Alert variant="warning">
            <div className="space-y-1">
              {stockWarnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </Alert>
        )}

        {/* Información del producto seleccionado */}
        {selectedProduct && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📦 Información del Producto</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Producto:</span>
                <div className="font-medium text-blue-900">{selectedProduct.nameProduct}</div>
              </div>
              <div>
                <span className="text-blue-700">Stock Actual:</span>
                <div className="font-bold text-blue-900">{selectedProduct.minStockLevel || 0} unidades</div>
              </div>
              <div>
                <span className="text-blue-700">Código:</span>
                <div className="font-mono text-blue-900">{selectedProduct.code}</div>
              </div>
              <div>
                <span className="text-blue-700">Stock después del lote:</span>
                <div className={`font-bold ${
                  (selectedProduct.minStockLevel || 0) - formData.initialQuantity < 0 
                    ? 'text-red-600' 
                    : (selectedProduct.minStockLevel || 0) - formData.initialQuantity < 10
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {(selectedProduct.minStockLevel || 0) - formData.initialQuantity} unidades
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código del Lote*"
            value={formData.batchCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('batchCode', e.target.value)
            }
            error={errors.batchCode}
            disabled={!!editingBatch}
            placeholder="LOTE-YYMMDD-XXXX"
            maxLength={50}
            rightIcon={!editingBatch ? (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, batchCode: generateBatchCode() }))}
                className="text-[#7ca1eb] hover:text-[#6b90da]"
                title="Generar código"
              >
                🔄
              </button>
            ) : undefined}
          />

          <Select
            label="Producto*"
            value={formData.productId}
            onChange={handleProductChange}
            options={productOptions}
            error={errors.productId}
            disabled={!!editingBatch}
          />

          <Input
            label="Fecha de Producción*"
            type="date"
            value={formData.productionDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('productionDate', e.target.value)
            }
            error={errors.productionDate}
            max={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Fecha de Vencimiento*"
            type="date"
            value={formData.expirationDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('expirationDate', e.target.value)
            }
            error={errors.expirationDate}
            min={formData.productionDate || new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Cantidad Inicial*"
            type="number"
            min="1"
            max="10000"
            step="1"
            value={formData.initialQuantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = parseInt(e.target.value) || 0;
              handleInputChange('initialQuantity', value);
              if (!editingBatch) {
                handleInputChange('currentQuantity', value);
              }
            }}
            error={errors.initialQuantity}
            placeholder="Unidades producidas"
          />

          {editingBatch && (
            <Input
              label="Cantidad Actual*"
              type="number"
              min="0"
              max={formData.initialQuantity}
              step="1"
              value={formData.currentQuantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleInputChange('currentQuantity', parseInt(e.target.value) || 0)
              }
              error={errors.currentQuantity}
              placeholder="Unidades disponibles"
            />
          )}

          <Input
            label="Costo del Lote ($)*"
            type="number"
            step="0.01"
            min="0"
            max="100000"
            value={formData.batchCost}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('batchCost', parseFloat(e.target.value) || 0)
            }
            error={errors.batchCost}
            placeholder="Costo total de producción"
          />

          <Select
            label="Asignar a Tienda"
            value={formData.storeId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('storeId', e.target.value ? parseInt(e.target.value) : undefined)
            }
            options={storeOptions}
            error={errors.storeId}
          />
        </div>

        {/* Información calculada */}
        {formData.initialQuantity > 0 && formData.batchCost > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">💰 Información Calculada</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800">
              <div>
                <span className="text-green-700">Costo por unidad:</span> 
                <div className="font-bold">${(formData.batchCost / formData.initialQuantity).toFixed(4)}</div>
              </div>
              {editingBatch && (
                <>
                  <div>
                    <span className="text-green-700">Unidades vendidas:</span> 
                    <div className="font-bold">{formData.initialQuantity - formData.currentQuantity}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Valor restante:</span> 
                    <div className="font-bold">${(formData.batchCost * (formData.currentQuantity / formData.initialQuantity)).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-green-700">% Vendido:</span> 
                    <div className="font-bold">{(((formData.initialQuantity - formData.currentQuantity) / formData.initialQuantity) * 100).toFixed(1)}%</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('isActive', e.target.checked)
            }
            className="w-4 h-4 text-[#7ca1eb] border-2 border-black rounded focus:ring-[#7ca1eb]"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Lote activo
          </label>
        </div>

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
            disabled={loading}
          >
            {editingBatch ? 'Actualizar' : 'Registrar'} Lote
          </Button>
        </div>
      </form>
    </Modal>
  );
};