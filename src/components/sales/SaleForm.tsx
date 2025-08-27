'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Table } from '@/components/ui/Table';
import { ClientForm } from '@/components/clients/ClientForm';
import { 
  SaleRequest, 
  SaleResponse, 
  StoreResponse, 
  ClientResponse, 
  UserResponse,
  ProductResponse,
  SaleDetailRequest,
  SaleDetailResponse,
  SaleType,
  ProductStoreResponse
} from '@/types';
import { 
  saleAPI, 
  saleDetailAPI, 
  productAPI, 
  productStoreAPI
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthNumericId } from '@/hooks/useAuthNumericId';
import { AppError } from '@/lib/error-handler';
import { formatters } from '@/utils/formatters';

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
  availableStock: number;
  productStoreId: number; // Nueva propiedad para identificar la relación producto-tienda
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T, index?: number) => React.ReactNode;
}

interface FormErrors {
  [key: string]: string;
}

interface ProductStoreInfo {
  stock: number;
  productStoreId: number;
  exists: boolean;
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
  const { numericUserId, loading: loadingUserId, error: userError } = useAuthNumericId();
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  const formatCurrency = useCallback((amount: number): string => {
    return formatters.currency(amount || 0);
  }, []);

  const [formData, setFormData] = useState<SaleRequest>({
    saleNumber: '',
    userId: '',
    clientId: undefined,
    storeId: 0,
    saleType: SaleType.RETAIL,
    subtotal: 0,
    discountPercentage: 0,
    discountAmount: 0,
    taxPercentage: 12,
    taxAmount: 0,
    totalAmount: 0,
    paymentMethod: '',
    notes: '',
    isInvoiced: false,
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productStocks, setProductStocks] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Add item form
  const [showAddItem, setShowAddItem] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<Partial<SaleItem>>({
    productId: 0,
    quantity: 1,
  });
  
  // Client form
  const [showClientForm, setShowClientForm] = useState<boolean>(false);

  // Función para generar número de venta automáticamente
  const generateSaleNumber = useCallback((): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `VT-${year}${month}${day}-${random}`;
  }, []);

  // Función para obtener stock real de ProductStore
  const getProductStoreStock = useCallback(async (productId: number, storeId: number): Promise<ProductStoreInfo> => {
    try {
      const productStores = await productStoreAPI.getAllProductStores();
      const productStore = productStores.find((ps: ProductStoreResponse) => 
        ps.product.id === productId && ps.store.id === storeId
      );
      
      if (productStore) {
        return {
          stock: productStore.currentStock,
          productStoreId: productStore.id,
          exists: true
        };
      } else {
        return { stock: 0, productStoreId: 0, exists: false };
      }
    } catch (err) {
      console.error('Error getting ProductStore stock:', err);
      return { stock: 0, productStoreId: 0, exists: false };
    }
  }, []);

  // Función para cargar productos disponibles en la tienda seleccionada
  const fetchProductsForStore = useCallback(async (storeId: number): Promise<void> => {
    if (!storeId || storeId === 0) {
      setProducts([]);
      setProductStocks(new Map());
      return;
    }

    try {
      setLoadingProducts(true);
      const [allProducts, productStores] = await Promise.all([
        productAPI.getAllProducts(),
        productStoreAPI.getAllProductStores()
      ]);
      
      // Filtrar productos que están disponibles en la tienda seleccionada
      const storeProductStores = productStores.filter((ps: ProductStoreResponse) => ps.store.id === storeId);
      const availableProducts = allProducts.filter((product: ProductResponse) => 
        product.isActive && storeProductStores.some((ps: ProductStoreResponse) => ps.product.id === product.id)
      );
      
      setProducts(availableProducts);
      
      // Crear mapa de stocks basado en ProductStore
      const stockMap = new Map<number, number>();
      storeProductStores.forEach((ps: ProductStoreResponse) => {
        stockMap.set(ps.product.id, ps.currentStock);
      });
      
      setProductStocks(stockMap);
      console.log('Productos disponibles en tienda:', availableProducts.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar productos de la tienda';
      setError(errorMessage);
      console.error('Error loading products for store:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const resetForm = useCallback((): void => {
    setFormData({
      saleNumber: generateSaleNumber(),
      userId: numericUserId > 0 ? numericUserId.toString() : '',
      clientId: undefined,
      storeId: 0,
      saleType: SaleType.RETAIL,
      subtotal: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 15,
      taxAmount: 0,
      totalAmount: 0,
      paymentMethod: '',
      notes: '',
      isInvoiced: false,
    });
    setSaleItems([]);
    setErrors({});
    setError('');
    setNewItem({ productId: 0, quantity: 1 });
    setProducts([]);
    setProductStocks(new Map());
  }, [numericUserId, generateSaleNumber]);

  // Cargar detalles de venta usando API separada
  const loadSaleItems = useCallback(async (saleId: number): Promise<void> => {
    try {
      console.log('🔍 Loading sale details for sale ID:', saleId);
      
      const allSaleDetails = await saleDetailAPI.getAllSaleDetails();
      const saleDetails = allSaleDetails.filter((detail: SaleDetailResponse) => detail.sale.id === saleId);
      
      console.log('📋 Sale details found:', saleDetails.length);
      
      if (saleDetails.length > 0) {
        const items: SaleItem[] = [];
        
        for (const detail of saleDetails) {
          const productStoreInfo = await getProductStoreStock(detail.product.id, formData.storeId);
          items.push({
            id: detail.id,
            productId: detail.product.id,
            product: detail.product,
            quantity: detail.quantity,
            unitPrice: Number(detail.unitPrice),
            subtotal: Number(detail.subtotal),
            availableStock: productStoreInfo.stock + detail.quantity,
            productStoreId: productStoreInfo.productStoreId
          });
        }
        
        setSaleItems(items);
        console.log('✅ Items de venta cargados:', items);
      } else {
        console.log('⚠️ No sale details found for this sale');
        setSaleItems([]);
      }
    } catch (err) {
      console.error('❌ Error loading sale items:', err);
      setSaleItems([]);
    }
  }, [getProductStoreStock, formData.storeId]);

  // Inicializar cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (editingSale) {
        setFormData({
          saleNumber: editingSale.saleNumber,
          userId: editingSale.user.id.toString(),
          clientId: editingSale.client?.id,
          storeId: editingSale.store.id,
          saleType: editingSale.saleType,
          subtotal: Number(editingSale.subtotal),
          discountPercentage: Number(editingSale.discountPercentage),
          discountAmount: Number(editingSale.discountAmount),
          taxPercentage: Number(editingSale.taxPercentage),
          taxAmount: Number(editingSale.taxAmount),
          totalAmount: Number(editingSale.totalAmount),
          paymentMethod: editingSale.paymentMethod || '',
          notes: editingSale.notes || '',
          isInvoiced: editingSale.isInvoiced,
        });
        
        // Cargar productos de la tienda y luego los items
        fetchProductsForStore(editingSale.store.id).then(() => {
          loadSaleItems(editingSale.id);
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingSale?.id, editingSale?.store.id]);

  // Actualizar userId cuando se obtenga del hook
  useEffect(() => {
    if (numericUserId > 0 && !editingSale) {
      setFormData((prev: SaleRequest) => ({ ...prev, userId: numericUserId.toString() }));
    }
  }, [numericUserId, editingSale]);

  // Cargar productos cuando cambie la tienda
  useEffect(() => {
    if (formData.storeId && formData.storeId > 0) {
      fetchProductsForStore(formData.storeId);
    } else {
      setProducts([]);
      setProductStocks(new Map());
    }
  }, [formData.storeId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.saleNumber.trim()) {
      newErrors.saleNumber = 'El número de venta es requerido';
    }

    if (!formData.userId || formData.userId.trim() === '') {
      newErrors.userId = 'Debe seleccionar un vendedor';
    }

    if (!formData.storeId || formData.storeId === 0) {
      newErrors.storeId = 'La tienda es requerida';
    }

    if (saleItems.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto a la venta';
    }

    if (!formData.paymentMethod?.trim()) {
      newErrors.paymentMethod = 'El método de pago es requerido';
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

  // Validación mejorada con ProductStore
  const validateNewItem = useCallback(async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    if (!newItem.productId || newItem.productId === 0) {
      newErrors.newItemProduct = 'Debe seleccionar un producto';
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      newErrors.newItemQuantity = 'La cantidad debe ser mayor a 0';
    }

    // Validación de stock usando ProductStore
    if (newItem.productId && newItem.quantity && formData.storeId) {
      const productStoreInfo = await getProductStoreStock(newItem.productId, formData.storeId);
      
      if (!productStoreInfo.exists) {
        newErrors.newItemProduct = 'Este producto no está disponible en la tienda seleccionada';
      } else {
        const existingItem = saleItems.find((item: SaleItem) => item.productId === newItem.productId);
        const existingQuantity = existingItem ? existingItem.quantity : 0;
        const totalRequested = (newItem.quantity || 0) + existingQuantity;

        if (totalRequested > productStoreInfo.stock) {
          newErrors.newItemQuantity = `Stock insuficiente. Disponible: ${productStoreInfo.stock}, Ya en venta: ${existingQuantity}`;
        }

        if (existingItem) {
          newErrors.newItemProduct = 'Este producto ya está en la venta. Use "Editar" para cambiar la cantidad.';
        }
      }
    }

    setErrors((prev: FormErrors) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [newItem.productId, newItem.quantity, formData.storeId, saleItems, getProductStoreStock]);

  const addItemToSale = useCallback(async (): Promise<void> => {
    if (!(await validateNewItem())) return;

    const product = products.find((p: ProductResponse) => p.id === newItem.productId);
    if (!product || !newItem.productId) return;

    // Usar el precio correcto según el tipo de venta
    const unitPrice = formData.saleType === SaleType.WHOLESALE 
      ? Number(product.wholesalePrice) 
      : Number(product.retailPrice);
      
    if (unitPrice === 0) {
      setErrors((prev: FormErrors) => ({ 
        ...prev, 
        newItemProduct: 'Este producto no tiene precio configurado para el tipo de venta seleccionado' 
      }));
      return;
    }

    const quantity = newItem.quantity || 1;
    const subtotal = unitPrice * quantity;
    
    // Obtener información del ProductStore
    const productStoreInfo = await getProductStoreStock(newItem.productId!, formData.storeId);

    const item: SaleItem = {
      productId: product.id,
      product,
      quantity,
      unitPrice,
      subtotal,
      availableStock: productStoreInfo.stock,
      productStoreId: productStoreInfo.productStoreId
    };

    setSaleItems((prev: SaleItem[]) => [...prev, item]);
    setNewItem({ productId: 0, quantity: 1 });
    setShowAddItem(false);
    
    // Clear any item-related errors
    setErrors((prev: FormErrors) => {
      const { newItemProduct, newItemQuantity, items, ...rest } = prev;
      return rest;
    });
  }, [validateNewItem, products, newItem.productId, newItem.quantity, formData.saleType, formData.storeId, getProductStoreStock]);

  const removeItemFromSale = useCallback((index: number): void => {
    setSaleItems((prev: SaleItem[]) => prev.filter((_, i: number) => i !== index));
  }, []);

  const updateItemQuantity = useCallback(async (index: number, newQuantity: number): Promise<void> => {
    if (newQuantity <= 0) return;

    const item = saleItems[index];
    if (!item) return;

    // Validar stock disponible en ProductStore
    const productStoreInfo = await getProductStoreStock(item.productId, formData.storeId);
    
    if (newQuantity > productStoreInfo.stock) {
      setError(`Stock insuficiente para ${item.product?.nameProduct}. Disponible: ${productStoreInfo.stock}`);
      return;
    }

    setSaleItems((prev: SaleItem[]) => prev.map((saleItem: SaleItem, i: number) => {
      if (i === index) {
        const subtotal = saleItem.unitPrice * newQuantity;
        return { ...saleItem, quantity: newQuantity, subtotal };
      }
      return saleItem;
    }));
    
    setError('');
  }, [saleItems, getProductStoreStock, formData.storeId]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      // Validación final de stock para todos los items usando ProductStore
      for (const item of saleItems) {
        const productStoreInfo = await getProductStoreStock(item.productId, formData.storeId);
        
        if (!productStoreInfo.exists) {
          throw new Error(`El producto ${item.product?.nameProduct} no está disponible en la tienda seleccionada`);
        }
        
        if (item.quantity > productStoreInfo.stock) {
          throw new Error(`Stock insuficiente para ${item.product?.nameProduct}. Disponible: ${productStoreInfo.stock}, Solicitado: ${item.quantity}`);
        }
      }

      // Calculate final totals
      const subtotal = saleItems.reduce((sum: number, item: SaleItem) => sum + item.subtotal, 0);
      const discountAmount = subtotal * (formData.discountPercentage / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (formData.taxPercentage / 100);
      const totalAmount = taxableAmount + taxAmount;

      // Preparar datos de venta
      const saleData: SaleRequest = {
        ...formData,
        userId: formData.userId,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
      };

      // Solo incluir clientId si tiene valor
      if (formData.clientId && formData.clientId > 0) {
        saleData.clientId = formData.clientId;
      }

      console.log('📤 [SaleForm] Enviando datos de venta:', saleData);

      let savedSale: SaleResponse;
      if (editingSale) {
        savedSale = await saleAPI.updateSale(editingSale.id, saleData);
      } else {
        savedSale = await saleAPI.createSale(saleData);
      }

      // Guardar detalles sin batchId
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
    } catch (err) {
      const errorMessage = editingSale 
        ? 'Error al actualizar la venta' 
        : 'Error al crear la venta';
      
      if (err instanceof AppError) {
        if (err.statusCode === 401) {
          setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else if (err.statusCode === 403) {
          setError('No tienes permisos para realizar esta acción.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(errorMessage);
      }
      
      console.error('Error submitting sale:', err);
    } finally {
      setSubmitting(false);
    }
  }, [validateForm, saleItems, formData, getProductStoreStock, editingSale, onSuccess]);

  const handleInputChange = useCallback((field: keyof SaleRequest, value: string | number | boolean | undefined): void => {
    setFormData((prev: SaleRequest) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: FormErrors) => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleModalClose = useCallback((): void => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleClientCreated = useCallback((newClient: ClientResponse): void => {
    clients.push(newClient);
    setFormData((prev: SaleRequest) => ({ ...prev, clientId: newClient.id }));
    setShowClientForm(false);
  }, [clients]);

  // Opciones para selects
  const storeOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar tienda...' },
    ...stores.map((store: StoreResponse) => ({ value: store.id, label: store.name }))
  ];

  const clientOptions: SelectOption[] = [
    { value: '', label: 'Cliente General (Sin cliente específico)' },
    ...clients.map((client: ClientResponse) => ({ value: client.id, label: client.nameLastname }))
  ];

  const productOptions: SelectOption[] = [
    { value: 0, label: 'Seleccionar producto...' },
    ...products.map((product: ProductResponse) => {
      const stock = productStocks.get(product.id) || 0;
      const price = formData.saleType === SaleType.WHOLESALE 
        ? product.wholesalePrice 
        : product.retailPrice;
      return { 
        value: product.id, 
        label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (Stock: ${stock}) - ${formatCurrency(Number(price))}` 
      };
    })
  ];

  // Opciones de método de pago
  const paymentMethodOptions: SelectOption[] = [
    { value: '', label: 'Seleccionar método de pago...' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
    { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
    { value: 'Transferencia', label: 'Transferencia Bancaria' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Mixto', label: 'Pago Mixto' },
  ];

  const userOptions: SelectOption[] = [
    { value: '', label: 'Seleccionar vendedor...' },
    ...users.map((user: UserResponse) => ({ value: user.id, label: `${user.name} (${user.email})` }))
  ];

  const saleTypeOptions: SelectOption[] = [
    { value: SaleType.RETAIL, label: 'Venta al Detalle' },
    { value: SaleType.WHOLESALE, label: 'Venta al Por Mayor' },
  ];

  // Calcular totales para mostrar
  const subtotal = saleItems.reduce((sum: number, item: SaleItem) => sum + item.subtotal, 0);
  const discountAmount = subtotal * (formData.discountPercentage / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (formData.taxPercentage / 100);
  const totalAmount = taxableAmount + taxAmount;

  const itemColumns: TableColumn<SaleItem>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (_: unknown, item: SaleItem) => (
        <div>
          <div className="font-medium text-gray-800">
            {item.product?.nameProduct}
          </div>
          <div className="text-sm text-gray-500">
            {item.product?.flavor} - {item.product?.size}
          </div>
          <div className="text-xs text-gray-600">
            Stock disponible: {item.availableStock}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (_: unknown, item: SaleItem, index?: number) => (
        <Input
          type="number"
          min="1"
          max={item.availableStock}
          value={item.quantity}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            updateItemQuantity(index!, parseInt(e.target.value) || 1)}
          className="w-20"
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Precio Unit.',
      render: (value: unknown) => (
        <span className="text-gray-700 font-medium">
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (value: unknown) => (
        <span className="text-gray-700 font-medium">
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: unknown, __: SaleItem, index?: number) => (
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

  const isUserValid = Boolean(formData.userId && formData.userId.trim() !== '');

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

        {/* Información básica de la venta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Número de Venta*"
            value={formData.saleNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleInputChange('saleNumber', e.target.value)}
            error={errors.saleNumber}
            placeholder="Ej: VT-20250826-XXXX"
            disabled={!!editingSale}
            rightIcon={!editingSale ? (
              <button
                type="button"
                onClick={() => setFormData((prev: SaleRequest) => ({ ...prev, saleNumber: generateSaleNumber() }))}
                className="text-[#7ca1eb] hover:text-[#6b90da]"
                title="Generar nuevo número"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            ) : undefined}
          />

          <Select
            label="Vendedor*"
            value={formData.userId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('userId', e.target.value)}
            options={userOptions}
            error={errors.userId}
          />

          <Select
            label="Tienda*"
            value={formData.storeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('storeId', parseInt(e.target.value) || 0)}
            options={storeOptions}
            error={errors.storeId}
          />

          <Select
            label="Tipo de Venta"
            value={formData.saleType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('saleType', e.target.value as SaleType)}
            options={saleTypeOptions}
          />

          {/* Método de pago como dropdown */}
          <Select
            label="Método de Pago*"
            value={formData.paymentMethod}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('paymentMethod', e.target.value)}
            options={paymentMethodOptions}
            error={errors.paymentMethod}
            className="md:col-span-2"
          />
        </div>

        {/* Cliente */}
        <div className="flex gap-4">
          <Select
            label="Cliente"
            value={formData.clientId || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleInputChange('clientId', e.target.value ? parseInt(e.target.value) : undefined)}
            options={clientOptions}
            className="flex-1"
          />
        </div>

        {/* Items de la venta */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Productos</h3>
            <Button
              type="button"
              onClick={() => setShowAddItem(true)}
              disabled={!formData.storeId || formData.storeId === 0}
            >
              + Agregar Producto
            </Button>
          </div>

          {!formData.storeId && (
            <Alert variant="warning">
              Selecciona una tienda primero para poder agregar productos
            </Alert>
          )}

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
            onClose={() => {
              setShowAddItem(false);
              setNewItem({ productId: 0, quantity: 1 });
            }}
            title="Agregar Producto"
            size="md"
          >
            <div className="space-y-4">
              <Select
                label="Producto*"
                value={newItem.productId || 0}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setNewItem((prev: Partial<SaleItem>) => ({ ...prev, productId: parseInt(e.target.value) || 0 }))}
                options={productOptions}
                error={errors.newItemProduct}
              />

              {products.length === 0 && formData.storeId > 0 && (
                <Alert variant="warning">
                  No hay productos disponibles en la tienda seleccionada
                </Alert>
              )}

              <Input
                label="Cantidad*"
                type="number"
                min="1"
                value={newItem.quantity || 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewItem((prev: Partial<SaleItem>) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
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
                  disabled={!newItem.productId}
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
                step="1"
                value={formData.discountPercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
                error={errors.discountPercentage}
              />

              <Input
                label="Impuesto (%)"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.taxPercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('taxPercentage', parseFloat(e.target.value) || 0)}
                error={errors.taxPercentage}
              />

              <div className="flex items-center">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isInvoiced}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('isInvoiced', e.target.checked)}
                    className="mr-2"
                  />
                  ¿Facturar?
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-700 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Descuento:</span>
                  <span className="text-gray-700 font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Impuesto:</span>
                  <span className="text-gray-700 font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span className="text-gray-800">Total:</span>
                  <span className="text-gray-800">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas adicionales
          </label>
          <textarea
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            placeholder="Observaciones adicionales sobre la venta..."
          />
        </div>

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
            disabled={submitting || !isUserValid || saleItems.length === 0}
          >
            {submitting ? 'Guardando...' : 
             (editingSale ? 'Actualizar Venta' : 'Crear Venta')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};