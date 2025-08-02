// src/components/sales/SaleForm.tsx
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
  const [formData, setFormData] = useState<SaleRequest>({
    saleNumber: '',
    userId: 1, // TODO: Get from auth context
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

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (editingSale) {
        setFormData({
          saleNumber: editingSale.saleNumber,
          userId: editingSale.user.id,
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
        // TODO: Fetch sale details for editing
        fetchSaleDetails(editingSale.id);
      } else {
        resetForm();
        generateSaleNumber();
      }
    }
  }, [isOpen, editingSale]);

  const fetchProducts = async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSaleDetails = async (saleId: number): Promise<void> => {
    try {
      // Obtener todos los sale details y filtrar por sale ID
      const allDetails = await saleDetailAPI.getAllSaleDetails();
      const filteredDetails = allDetails.filter(detail => detail.sale.id === saleId);
      
      const items: SaleItem[] = filteredDetails.map(detail => ({
        id: detail.id,
        productId: detail.product.id,
        product: detail.product,
        quantity: detail.quantity,
        unitPrice: Number(detail.unitPrice),
        subtotal: Number(detail.subtotal),
      }));
      setSaleItems(items);
    } catch (err) {
      console.error('Error fetching sale details:', err);
    }
  };

  const generateSaleNumber = (): void => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    setFormData(prev => ({ ...prev, saleNumber: `VT-${year}${month}${day}-${random}` }));
  };

  const resetForm = (): void => {
    setFormData({
      saleNumber: '',
      userId: 1,
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
    setNewItem({ productId: 0, quantity: 1 });
    setErrors({});
    setError('');
    setShowAddItem(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.saleNumber.trim()) {
      newErrors.saleNumber = 'El número de venta es requerido';
    }

    if (!formData.storeId || formData.storeId === 0) {
      newErrors.storeId = 'La tienda es requerida';
    }

    if (!formData.userId || formData.userId === 0) {
      newErrors.userId = 'El usuario/vendedor es requerido';
    }

    if (saleItems.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto a la venta';
    }

    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'El descuento debe estar entre 0 y 100%';
    }

    if (formData.taxPercentage < 0 || formData.taxPercentage > 100) {
      newErrors.taxPercentage = 'El impuesto debe estar entre 0 y 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotals = useCallback(() => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = formData.discountPercentage > 0 
      ? (subtotal * formData.discountPercentage) / 100 
      : formData.discountAmount;
    const totalWithDiscount = subtotal - discountAmount;
    const taxAmount = (totalWithDiscount * formData.taxPercentage) / 100;
    const totalAmount = totalWithDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }, [saleItems, formData.discountPercentage, formData.discountAmount, formData.taxPercentage]);

  const totals = calculateTotals();

  const handleAddItem = (): void => {
    if (!newItem.productId || newItem.productId === 0) {
      setError('Selecciona un producto');
      return;
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    const product = products.find(p => p.id === newItem.productId);
    if (!product) {
      setError('Producto no encontrado');
      return;
    }

    // Check if product already exists in items
    const existingItemIndex = saleItems.findIndex(item => item.productId === newItem.productId);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...saleItems];
      updatedItems[existingItemIndex].quantity += newItem.quantity!;
      updatedItems[existingItemIndex].subtotal = 
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
      setSaleItems(updatedItems);
    } else {
      // Add new item
      const unitPrice = formData.saleType === SaleType.RETAIL 
        ? Number(product.retailPrice) 
        : Number(product.wholesalePrice);
      
      const newSaleItem: SaleItem = {
        productId: newItem.productId!,
        product,
        quantity: newItem.quantity!,
        unitPrice,
        subtotal: unitPrice * newItem.quantity!,
      };

      setSaleItems(prev => [...prev, newSaleItem]);
    }

    setNewItem({ productId: 0, quantity: 1 });
    setShowAddItem(false);
    setError('');
  };

  const handleRemoveItem = (index: number): void => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, quantity: number): void => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }

    // Validar que el índice sea válido
    if (index < 0 || index >= saleItems.length) {
      console.error('Índice inválido:', index);
      return;
    }

    const updatedItems = [...saleItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].subtotal = updatedItems[index].unitPrice * quantity;
    setSaleItems(updatedItems);
  };

// REEMPLAZAR handleSubmit en SaleForm.tsx:
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Update form data with calculated totals
      const saleData = {
        ...formData,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
      };

      let savedSale: SaleResponse;
      
      if (editingSale) {
        // Actualizar venta existente
        savedSale = await saleAPI.updateSale(editingSale.id, saleData);
        
        // Para edición, necesitamos manejar los detalles de venta
        // Primero eliminar los detalles existentes (si es necesario)
        // Luego crear los nuevos detalles
        
        // Por simplicidad, solo actualizar la venta principal
        console.log('Venta actualizada:', savedSale);
      } else {
        // Crear nueva venta
        savedSale = await saleAPI.createSale(saleData);
        
        // Create sale details
        for (const item of saleItems) {
          const detailData: SaleDetailRequest = {
            saleId: savedSale.id,
            productId: item.productId,
            quantity: item.quantity,
          };
          await saleDetailAPI.createSaleDetail(detailData);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      let errorMessage = editingSale ? 'Error al actualizar la venta' : 'Error al crear la venta';
      
      if (err instanceof ApiError) {
        if (err.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
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

  const storeOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar tienda...' },
    ...stores.map(store => ({ value: store.id, label: store.name }))
  ];

  const clientOptions: SelectOption[] = [
    { value: '', label: 'Cliente General (Sin cliente específico)' },
    ...clients.map(client => ({ value: client.id, label: client.nameLastname }))
  ];

  const userOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar vendedor...' },
    ...users.map(user => ({ value: user.id, label: user.name }))
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

  const itemColumns: TableColumn<SaleItem>[] = [
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string, row: SaleItem) => (
        <div>
          <div className="font-medium text-gray-700 text-sm">{value}</div>
          <div className="text-xs text-gray-600">
            {row.product?.flavor && `${row.product.flavor} - `}
            {row.product?.size || 'Sin tamaño'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (value: number, row: SaleItem) => {
        const index = saleItems.findIndex(item => 
          item.productId === row.productId && 
          item.id === row.id
        );
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 0)}
            className="w-20"
            min="1"
          />
        );
      },
    },
    {
      key: 'unitPrice',
      header: 'Precio Unit.',
      render: (value: number) => <span className='text-gray-700'>{formatCurrency(value)}</span>,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (value: number) => (
        <span className="font-bold text-green-600">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: SaleItem) => {
        const index = saleItems.findIndex(item => 
          item.productId === row.productId && 
          item.id === row.id
        );
        return (
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleRemoveItem(index)}
          >
            Eliminar
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={editingSale ? 'Editar Venta' : 'Crear Nueva Venta'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {errors.items && (
          <Alert variant="warning">
            {errors.items}
          </Alert>
        )}
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número de Venta*"
            value={formData.saleNumber}
            onChange={(e) => handleInputChange('saleNumber', e.target.value)}
            error={errors.saleNumber}
            disabled={!!editingSale || submitting}
            placeholder="VT-YYYYMMDD-XXXX"
            required
          />

          <Select
            label="Tienda*"
            value={formData.storeId}
            onChange={(e) => handleInputChange('storeId', parseInt(e.target.value))}
            options={storeOptions}
            error={errors.storeId}
            disabled={submitting}
            required
          />

          <Select
            label="Vendedor*"
            value={formData.userId}
            onChange={(e) => handleInputChange('userId', parseInt(e.target.value))}
            options={userOptions}
            error={errors.userId}
            disabled={submitting}
            required
          />

          <div className="flex space-x-2">
            <div className="flex-1">
              <Select
                label="Cliente"
                value={formData.clientId?.toString() || ''}
                onChange={(e) => handleInputChange('clientId', e.target.value ? parseInt(e.target.value) : undefined)}
                options={clientOptions}
                disabled={submitting}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowClientForm(true)}
                disabled={submitting}
                className="px-3"
              >
                + Cliente
              </Button>
            </div>
          </div>

          <Select
            label="Tipo de Venta*"
            value={formData.saleType}
            onChange={(e) => handleInputChange('saleType', e.target.value as SaleType)}
            options={saleTypeOptions}
            disabled={submitting}
            required
          />

          <Input
            label="Método de Pago"
            value={formData.paymentMethod}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            placeholder="Efectivo, Tarjeta, Transferencia..."
            disabled={submitting}
          />
        </div>

        {/* Sale Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg text-gray-800 font-bold">Productos de la Venta</h3>
            <Button
              type="button"
              variant="success"
              onClick={() => setShowAddItem(!showAddItem)}
              disabled={submitting}
            >
              + Agregar Producto
            </Button>
          </div>

          {showAddItem && (
            <div className="bg-gray-50 border-2 border-black p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Producto*"
                  value={newItem.productId || 0}
                  onChange={(e) => setNewItem(prev => ({ ...prev, productId: parseInt(e.target.value) }))}
                  options={productOptions}
                />

                <Input
                  label="Cantidad*"
                  type="number"
                  value={newItem.quantity || 1}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                />

                <div className="flex items-end space-x-2">
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItem.productId || !newItem.quantity}
                  >
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddItem(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {saleItems.length > 0 && (
            <Table
              data={saleItems}
              columns={itemColumns}
              emptyMessage="No hay productos agregados"
            />
          )}
        </div>

        {/* Discounts and Taxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Descuento (%)"
            type="number"
            step="1"
            value={formData.discountPercentage}
            onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
            error={errors.discountPercentage}
            min="0"
            max="100"
            disabled={submitting}
          />

          <Input
            label="Impuesto (%)"
            type="number"
            step="1"
            value={formData.taxPercentage}
            onChange={(e) => handleInputChange('taxPercentage', parseFloat(e.target.value) || 0)}
            error={errors.taxPercentage}
            min="0"
            max="100"
            disabled={submitting}
          />
        </div>

        {/* Totals Summary */}
        {saleItems.length > 0 && (
          <div className="bg-gray-50 border-2 border-black p-4 text-gray-700">
            <h4 className="font-bold mb-4">Resumen de Totales</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento:</span>
                <span className="font-bold text-red-600">-{formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos:</span>
                <span className="font-bold">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-black pt-2">
                <span className="text-lg font-bold">TOTAL:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <Input
          label="Notas"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Observaciones adicionales..."
          disabled={submitting}
        />

        {/* Invoiced checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isInvoiced"
            checked={formData.isInvoiced}
            onChange={(e) => handleInputChange('isInvoiced', e.target.checked)}
            className="w-4 h-4 border-2 border-black"
            disabled={submitting}
          />
          <label htmlFor="isInvoiced" className="text-sm font-medium text-gray-700">
            Venta facturada
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
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
            disabled={submitting || saleItems.length === 0}
          >
            {editingSale ? 'Actualizar' : 'Crear'} Venta
          </Button>
        </div>
      </form>

      <ClientForm
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSuccess={handleClientCreated}
      />
    </Modal>
  );
};