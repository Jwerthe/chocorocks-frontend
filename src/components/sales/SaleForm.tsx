// src/components/sales/SaleForm.tsx - CORREGIDO
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ClientForm } from './ClientForm';
import { 
  SaleRequest, 
  SaleResponse, 
  StoreResponse, 
  ClientResponse, 
  UserResponse,
  ProductResponse,
  SaleDetailRequest,
  SaleDetailResponse,
  SaleType 
} from '@/types';
import { saleAPI, saleDetailAPI, productAPI, ApiError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthNumericId } from '@/hooks/useAuthNumericId';

interface SaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSale?: SaleResponse | null;
  stores: StoreResponse[];
  clients: ClientResponse[];
  users: UserResponse[];
}

interface SelectOption {
  value: number | string;
  label: string;
}

interface SaleItem {
  id?: number;
  productId: number;
  product?: ProductResponse;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingSale,
  stores,
  clients,
  users,
}) => {
  const { user } = useAuth();
  const { numericUserId, loading: loadingUserId, error: userError } = useAuthNumericId(); // ✅ HOOK: Obtener ID numérico

  const [formData, setFormData] = useState<SaleRequest>({
    saleNumber: '',
    userId: 0, // ✅ CAMBIADO: Se llenará dinámicamente
    clientId: undefined,
    storeId: 0,
    saleType: SaleType.RETAIL,
    discountPercentage: 0,
    discountAmount: 0,
    taxPercentage: 12,
    taxAmount: 0,
    paymentMethod: '',
    notes: '',
    isInvoiced: false,
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Add item form
  const [showAddItem, setShowAddItem] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<Partial<SaleItem>>({
    productId: 0,
    quantity: 1,
  });
  
  // Client form
  const [showClientForm, setShowClientForm] = useState<boolean>(false);

  // ✅ SIMPLIFICADO: Inicializar cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      
      if (editingSale) {
        setFormData({
          saleNumber: editingSale.saleNumber,
          userId: editingSale.user.id, // Al editar, usar el ID existente
          clientId: editingSale.client?.id,
          storeId: editingSale.store.id,
          saleType: editingSale.saleType,
          discountPercentage: Number(editingSale.discountPercentage),
          discountAmount: Number(editingSale.discountAmount),
          taxPercentage: Number(editingSale.taxPercentage),
          taxAmount: Number(editingSale.taxAmount),
          paymentMethod: editingSale.paymentMethod || '',
          notes: editingSale.notes || '',
          isInvoiced: editingSale.isInvoiced,
        });
        loadSaleItems(editingSale.id);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingSale]);

  // ✅ NUEVO: Actualizar userId cuando se obtenga del hook
  useEffect(() => {
    if (numericUserId > 0 && !editingSale) {
      setFormData(prev => ({ ...prev, userId: numericUserId }));
    }
  }, [numericUserId, editingSale]);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar productos';
      setError(errorMessage);
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSaleItems = useCallback(async (saleId: number): Promise<void> => {
    try {
      const details = await saleDetailAPI.getAllSaleDetails();
      const saleDetails = details.filter(detail => detail.sale.id === saleId);
      
      const items: SaleItem[] = saleDetails.map(detail => ({
        id: detail.id,
        productId: detail.product.id,
        product: detail.product,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        subtotal: detail.subtotal,
      }));
      
      setSaleItems(items);
    } catch (err) {
      console.error('Error loading sale items:', err);
    }
  }, []);

  const resetForm = useCallback((): void => {
    setFormData({
      saleNumber: '',
      userId: numericUserId, // ✅ USAR: ID del hook
      clientId: undefined,
      storeId: 0,
      saleType: SaleType.RETAIL,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 12,
      taxAmount: 0,
      paymentMethod: '',
      notes: '',
      isInvoiced: false,
    });
    setSaleItems([]);
    setErrors({});
    setError('');
    setNewItem({ productId: 0, quantity: 1 });
  }, [numericUserId]);

  const calculateTotals = useCallback((): void => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = subtotal * (formData.discountPercentage / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (formData.taxPercentage / 100);
    const totalAmount = taxableAmount + taxAmount;

    setFormData(prev => ({
      ...prev,
      discountAmount,
      taxAmount,
    }));
  }, [saleItems, formData.discountPercentage, formData.taxPercentage]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.saleNumber.trim()) {
      newErrors.saleNumber = 'El número de venta es requerido';
    }

    // ✅ VALIDACIÓN: Verificar que hay usuario numérico válido del hook
    if (!numericUserId || numericUserId === 0) {
      newErrors.userId = 'Error: No se pudo obtener la información del usuario. Por favor, recarga la página.';
    }

    if (!formData.storeId || formData.storeId === 0) {
      newErrors.storeId = 'La tienda es requerida';
    }

    if (saleItems.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto a la venta';
    }

    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'El descuento debe estar entre 0% y 100%';
    }

    if (formData.taxPercentage < 0 || formData.taxPercentage > 100) {
      newErrors.taxPercentage = 'El impuesto debe estar entre 0% y 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateNewItem = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newItem.productId || newItem.productId === 0) {
      newErrors.newItemProduct = 'Debe seleccionar un producto';
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      newErrors.newItemQuantity = 'La cantidad debe ser mayor a 0';
    }

    // Check if product already exists in sale items
    if (newItem.productId && saleItems.some(item => item.productId === newItem.productId)) {
      newErrors.newItemProduct = 'Este producto ya está en la venta';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const addItemToSale = (): void => {
    if (!validateNewItem()) return;

    const product = products.find(p => p.id === newItem.productId);
    if (!product) return;

    const unitPrice = product.retailPrice; // Assuming retail price for now
    const quantity = newItem.quantity || 1;
    const subtotal = unitPrice * quantity;

    const item: SaleItem = {
      productId: product.id,
      product,
      quantity,
      unitPrice,
      subtotal,
    };

    setSaleItems(prev => [...prev, item]);
    setNewItem({ productId: 0, quantity: 1 });
    setShowAddItem(false);
    
    // Clear any item-related errors
    setErrors(prev => {
      const { newItemProduct, newItemQuantity, items, ...rest } = prev;
      return rest;
    });
  };

  const removeItemFromSale = (index: number): void => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQuantity: number): void => {
    if (newQuantity <= 0) return;

    setSaleItems(prev => prev.map((item, i) => {
      if (i === index) {
        const subtotal = item.unitPrice * newQuantity;
        return { ...item, quantity: newQuantity, subtotal };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      // ✅ VALIDACIÓN: Verificar userId numérico del hook antes de enviar
      if (!numericUserId || numericUserId === 0) {
        throw new Error('No se pudo obtener el ID del usuario. Por favor, recarga la página.');
      }

      // Calculate final totals
      const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = subtotal * (formData.discountPercentage / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (formData.taxPercentage / 100);

      const saleData: SaleRequest = {
        ...formData,
        userId: numericUserId, // ✅ USAR: ID numérico del hook
        discountAmount,
        taxAmount,
      };

      console.log('📤 [SaleForm] Enviando datos de venta:', saleData);

      let savedSale: SaleResponse;
      if (editingSale) {
        savedSale = await saleAPI.updateSale(editingSale.id, saleData);
      } else {
        savedSale = await saleAPI.createSale(saleData);
      }

      // Save sale items
      for (const item of saleItems) {
        const saleDetailData: SaleDetailRequest = {
          saleId: savedSale.id,
          productId: item.productId,
          quantity: item.quantity,
        };

        if (item.id && editingSale) {
          await saleDetailAPI.updateSaleDetail(item.id, saleDetailData);
        } else {
          await saleDetailAPI.createSaleDetail(saleDetailData);
        }
      }

      onSuccess();
      handleModalClose();
    } catch (err: any) {
      const errorMessage = editingSale 
        ? 'Error al actualizar la venta' 
        : 'Error al crear la venta';
      
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else if (err.status === 403) {
          setError('No tienes permisos para realizar esta acción.');
        } else {
          setError(err.message);
        }
      } else {
        setError(errorMessage);
      }
      
      console.error('Error submitting sale:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SaleRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const handleClientCreated = (newClient: ClientResponse): void => {
    // Add the new client to the clients list
    clients.push(newClient);
    // Select the new client
    setFormData(prev => ({ ...prev, clientId: newClient.id }));
    setShowClientForm(false);
  };

  // Opciones para selects
  const storeOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar tienda...' },
    ...stores.map(store => ({ value: store.id, label: store.name }))
  ];

  const clientOptions: SelectOption[] = [
    { value: '', label: 'Cliente General (Sin cliente específico)' },
    ...clients.map(client => ({ value: client.id, label: client.nameLastname }))
  ];

  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map(product => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (${product.size || 'Sin tamaño'})` 
    }))
  ];

  const saleTypeOptions: SelectOption[] = [
    { value: SaleType.RETAIL, label: 'Venta al Detalle' },
    { value: SaleType.WHOLESALE, label: 'Venta al Por Mayor' },
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calcular totales para mostrar
  const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = subtotal * (formData.discountPercentage / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (formData.taxPercentage / 100);
  const totalAmount = taxableAmount + taxAmount;

  const itemColumns: TableColumn<SaleItem>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (_, item) => (
        <div>
          <div className="font-medium text-gray-800">
            {item.product?.nameProduct}
          </div>
          <div className="text-sm text-gray-500">
            {item.product?.flavor} - {item.product?.size}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (_, item, index) => (
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => updateItemQuantity(index!, parseInt(e.target.value) || 1)}
          className="w-20"
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Precio Unit.',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_, __, index) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => removeItemFromSale(index!)}
        >
          Eliminar
        </Button>
      ),
    },
  ];

  // ✅ ESTADO: Validación del usuario usando el hook
  const isUserValid = numericUserId > 0 && !loadingUserId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingSale ? 'Editar Venta' : 'Nueva Venta'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {errors.userId && <Alert variant="error">{errors.userId}</Alert>}
        
        {/* ✅ ALERTAS: Estado del usuario */}
        {userError && <Alert variant="error">{userError}</Alert>}
        {!isUserValid && loadingUserId && (
          <Alert variant="warning">
            ⚠️ Cargando información del usuario...
          </Alert>
        )}

        {/* ✅ DEBUG: Info del usuario en desarrollo */}
        {process.env.NODE_ENV === 'development' && user && numericUserId > 0 && (
          <div className="bg-gray-100 p-2 text-xs text-gray-600">
            <strong>Debug Info:</strong> 
            Auth UUID: {user.id} | 
            Backend ID: {numericUserId} | 
            Email: {user.email}
          </div>
        )}

        {/* Información básica de la venta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número de Venta*"
            value={formData.saleNumber}
            onChange={(e) => handleInputChange('saleNumber', e.target.value)}
            error={errors.saleNumber}
            placeholder="Ej: SALE-001"
          />

          <Select
            label="Tienda*"
            value={formData.storeId}
            onChange={(e) => handleInputChange('storeId', parseInt(e.target.value) || 0)}
            options={storeOptions}
            error={errors.storeId}
          />

          <Select
            label="Tipo de Venta"
            value={formData.saleType}
            onChange={(e) => handleInputChange('saleType', e.target.value as SaleType)}
            options={saleTypeOptions}
          />

          <div className="flex gap-2">
            <Select
              label="Cliente"
              value={formData.clientId || ''}
              onChange={(e) => handleInputChange('clientId', e.target.value ? parseInt(e.target.value) : undefined)}
              options={clientOptions}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClientForm(true)}
              className="mt-6"
            >
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Items de la venta */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Productos</h3>
            <Button
              type="button"
              onClick={() => setShowAddItem(true)}
            >
              + Agregar Producto
            </Button>
          </div>

          {errors.items && <Alert variant="error">{errors.items}</Alert>}

          {saleItems.length > 0 ? (
            <Table
              data={saleItems}
              columns={itemColumns}
              loading={false}
              emptyMessage="No hay productos en la venta"
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay productos agregados a la venta
            </div>
          )}
        </div>

        {/* Modal para agregar producto */}
        {showAddItem && (
          <Modal
            isOpen={showAddItem}
            onClose={() => setShowAddItem(false)}
            title="Agregar Producto"
            size="md"
          >
            <div className="space-y-4">
              <Select
                label="Producto*"
                value={newItem.productId || 0}
                onChange={(e) => setNewItem(prev => ({ ...prev, productId: parseInt(e.target.value) || 0 }))}
                options={productOptions}
                error={errors.newItemProduct}
              />

              <Input
                label="Cantidad*"
                type="number"
                min="1"
                value={newItem.quantity || 1}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                error={errors.newItemQuantity}
              />

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddItem(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={addItemToSale}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Totales */}
        {saleItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Descuento (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountPercentage}
                onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
                error={errors.discountPercentage}
              />

              <Input
                label="Impuesto (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.taxPercentage}
                onChange={(e) => handleInputChange('taxPercentage', parseFloat(e.target.value) || 0)}
                error={errors.taxPercentage}
              />

              <Input
                label="Método de Pago"
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                placeholder="Efectivo, Tarjeta, etc."
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto:</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <Input
          label="Notas"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Observaciones adicionales..."
        />

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            disabled={!isUserValid || saleItems.length === 0 || loadingUserId}
          >
            {loadingUserId ? 'Validando usuario...' : 
             editingSale ? 'Actualizar Venta' : 'Crear Venta'}
          </Button>
        </div>
      </form>

      {/* Cliente Form Modal */}
      <ClientForm
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSuccess={handleClientCreated}
      />
    </Modal>
  );
};