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
  SaleType,
  ProductBatchResponse,
  InventoryMovementRequest,
  MovementType,
  MovementReason
} from '@/types';
import { 
  saleAPI, 
  saleDetailAPI, 
  productAPI, 
  productBatchAPI,
  inventoryMovementAPI
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthNumericId } from '@/hooks/useAuthNumericId';
import { AppError } from '@/lib/error-handler';

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
  batchId?: number; // ✅ LOTES
  batch?: ProductBatchResponse; // ✅ LOTES
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T, index?: number) => React.ReactNode;
}

interface FormErrors {
  [key: string]: string;
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

  // ✅ FUNCIÓN formatCurrency ANTES de usarla
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

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
    batchId: undefined, // ✅ LOTES
    quantity: 1,
  });
  const [availableBatches, setAvailableBatches] = useState<ProductBatchResponse[]>([]); // ✅ LOTES
  
  // ✅ FUNCIÓN para generar número de venta automáticamente
  const generateSaleNumber = useCallback((): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `VT-${year}${month}${day}-${random}`;
  }, []);
  // Client form
  const [showClientForm, setShowClientForm] = useState<boolean>(false);

  // ✅ FUNCIÓN para obtener stock real de un producto
  const getProductStock = useCallback(async (productId: number): Promise<number> => {
    try {
      const batches = await productBatchAPI.getAllBatches();
      const productBatches = batches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );
      
      const totalStock = productBatches.reduce((total, batch) => total + batch.currentQuantity, 0);
      console.log(`📦 Stock del producto ${productId}: ${totalStock}`);
      return totalStock;
    } catch (err) {
      console.error('Error getting product stock:', err);
      return 0;
    }
  }, []);

  // ✅ NUEVO: Cargar lotes disponibles para un producto FILTRADOS POR TIENDA
  const fetchBatchesForProduct = useCallback(async (productId: number): Promise<void> => {
    try {
      const batches = await productBatchAPI.getAllBatches();
      let productBatches = batches.filter(batch => 
        batch.product.id === productId && 
        batch.isActive && 
        batch.currentQuantity > 0
      );

      // ✅ NUEVO: Filtrar por tienda seleccionada
      if (formData.storeId > 0) {
        productBatches = productBatches.filter(batch => 
          batch.store?.id === formData.storeId
        );
      }

      setAvailableBatches(productBatches);
      
      // Si solo hay un lote, seleccionarlo automáticamente
      if (productBatches.length === 1) {
        setNewItem(prev => ({ ...prev, batchId: productBatches[0].id }));
      } else if (productBatches.length === 0) {
        setNewItem(prev => ({ ...prev, batchId: undefined }));
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      setAvailableBatches([]);
    }
  }, [formData.storeId]);

  // ✅ CARGAR stocks de todos los productos
  const fetchProductStocks = useCallback(async (): Promise<void> => {
    try {
      const stockMap = new Map<number, number>();
      
      for (const product of products) {
        const stock = await getProductStock(product.id);
        stockMap.set(product.id, stock);
      }
      
      setProductStocks(stockMap);
      console.log('📊 Stocks cargados:', Object.fromEntries(stockMap));
    } catch (err) {
      console.error('Error fetching product stocks:', err);
    }
  }, [products, getProductStock]);

  const resetForm = useCallback((): void => {
    setFormData({
      saleNumber: generateSaleNumber(),
      userId: numericUserId > 0 ? numericUserId.toString() : '', // ✅ Usuario autenticado por defecto
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
    setSaleItems([]);
    setErrors({});
    setError('');
    setNewItem({ productId: 0, batchId: undefined, quantity: 1 });
    setAvailableBatches([]);
  }, [numericUserId]);

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

  // ✅ CORREGIDO: Cargar detalles de venta usando API separada
  const loadSaleItems = useCallback(async (saleId: number): Promise<void> => {
    try {
      console.log('🔍 Loading sale details for sale ID:', saleId);
      
      // ✅ CORREGIDO: SaleResponse NO incluye saleDetails - usar API separada
      const allSaleDetails = await saleDetailAPI.getAllSaleDetails();
      const saleDetails = allSaleDetails.filter(detail => detail.sale.id === saleId);
      
      console.log('📋 Sale details found:', saleDetails.length);
      
      if (saleDetails.length > 0) {
        const items: SaleItem[] = [];
        
        for (const detail of saleDetails) {
          const availableStock = await getProductStock(detail.product.id);
          items.push({
            id: detail.id,
            productId: detail.product.id,
            product: detail.product,
            batchId: detail.batch?.id,
            batch: detail.batch,
            quantity: detail.quantity,
            unitPrice: Number(detail.unitPrice),
            subtotal: Number(detail.subtotal),
            availableStock: availableStock + detail.quantity
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
  }, [getProductStock]);

  // ✅ Inicializar cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      
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
        loadSaleItems(editingSale.id);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingSale, fetchProducts, loadSaleItems, resetForm]);

  // ✅ NUEVO: Actualizar userId cuando se obtenga del hook
  useEffect(() => {
    if (numericUserId > 0 && !editingSale) {
      setFormData(prev => ({ ...prev, userId: numericUserId.toString() }));
    }
  }, [numericUserId, editingSale]);

  // ✅ Cargar lotes cuando se seleccione un producto
  useEffect(() => {
    if (newItem.productId && newItem.productId > 0) {
      fetchBatchesForProduct(newItem.productId);
    } else {
      setAvailableBatches([]);
      setNewItem(prev => ({ ...prev, batchId: undefined }));
    }
  }, [newItem.productId, fetchBatchesForProduct]);

  // ✅ Cargar stocks cuando cambien los productos
  useEffect(() => {
    if (products.length > 0) {
      fetchProductStocks();
    }
  }, [products, fetchProductStocks]);

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

  // ✅ VALIDACIÓN mejorada con lotes
  const validateNewItem = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    if (!newItem.productId || newItem.productId === 0) {
      newErrors.newItemProduct = 'Debe seleccionar un producto';
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      newErrors.newItemQuantity = 'La cantidad debe ser mayor a 0';
    }

    // ✅ VALIDACIÓN DE STOCK con lotes
    if (newItem.productId && newItem.quantity) {
      if (newItem.batchId) {
        // Si se seleccionó un lote específico
        const selectedBatch = availableBatches.find(b => b.id === newItem.batchId);
        if (selectedBatch && newItem.quantity > selectedBatch.currentQuantity) {
          newErrors.newItemQuantity = `Stock insuficiente en lote ${selectedBatch.batchCode}. Disponible: ${selectedBatch.currentQuantity}`;
        }
      } else {
        // Si no se seleccionó lote, validar stock total
        const availableStock = productStocks.get(newItem.productId) || 0;
        const existingItem = saleItems.find(item => item.productId === newItem.productId);
        const existingQuantity = existingItem ? existingItem.quantity : 0;
        const totalRequested = (newItem.quantity || 0) + existingQuantity;

        if (totalRequested > availableStock) {
          newErrors.newItemQuantity = `Stock insuficiente. Disponible: ${availableStock}, Ya en venta: ${existingQuantity}`;
        }
      }

      const existingItem = saleItems.find(item => 
        item.productId === newItem.productId && 
        item.batchId === newItem.batchId
      );
      if (existingItem) {
        newErrors.newItemProduct = 'Este producto/lote ya está en la venta. Use "Editar" para cambiar la cantidad.';
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const addItemToSale = async (): Promise<void> => {
    if (!(await validateNewItem())) return;

    const product = products.find(p => p.id === newItem.productId);
    if (!product) return;

    const unitPrice = Number(product.retailPrice) || 0;
    if (unitPrice === 0) {
      setErrors(prev => ({ 
        ...prev, 
        newItemProduct: 'Este producto no tiene precio configurado' 
      }));
      return;
    }

    const quantity = newItem.quantity || 1;
    const subtotal = unitPrice * quantity;
    
    // ✅ INFORMACIÓN del lote
    const selectedBatch = availableBatches.find(b => b.id === newItem.batchId);
    const availableStock = selectedBatch 
      ? selectedBatch.currentQuantity 
      : (productStocks.get(product.id) || 0);

    const item: SaleItem = {
      productId: product.id,
      product,
      batchId: newItem.batchId,
      batch: selectedBatch,
      quantity,
      unitPrice,
      subtotal,
      availableStock
    };

    setSaleItems(prev => [...prev, item]);
    setNewItem({ productId: 0, batchId: undefined, quantity: 1 });
    setAvailableBatches([]);
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

  const updateItemQuantity = async (index: number, newQuantity: number): Promise<void> => {
    if (newQuantity <= 0) return;

    const item = saleItems[index];
    if (!item) return;

    // ✅ VALIDAR STOCK al actualizar cantidad
    const availableStock = item.batch 
      ? item.batch.currentQuantity 
      : (productStocks.get(item.productId) || 0);
    
    if (newQuantity > availableStock) {
      setError(`Stock insuficiente para ${item.product?.nameProduct}. Disponible: ${availableStock}`);
      return;
    }

    setSaleItems(prev => prev.map((saleItem, i) => {
      if (i === index) {
        const subtotal = saleItem.unitPrice * newQuantity;
        return { ...saleItem, quantity: newQuantity, subtotal };
      }
      return saleItem;
    }));
    
    setError('');
  };

  // ✅ CREAR movimientos de inventario con lotes
  const createInventoryMovements = async (saleId: number): Promise<void> => {
    if (!formData.userId) return;

    for (const item of saleItems) {
      try {
        const movementData: InventoryMovementRequest = {
          productId: item.productId,
          batchId: item.batchId, // ✅ INCLUIR lote específico
          fromStoreId: formData.storeId,
          movementType: MovementType.OUT,
          quantity: item.quantity,
          reason: MovementReason.SALE,
          userId: formData.userId,
          referenceId: saleId,
          referenceType: 'SALE',
          notes: `Venta #${formData.saleNumber}`
        };

        await inventoryMovementAPI.createMovement(movementData);
        console.log(`✅ Movimiento creado para producto ${item.productId}: -${item.quantity} desde tienda ${formData.storeId}`);
      } catch (err) {
        console.error(`Error creating inventory movement for product ${item.productId}:`, err);
        throw new Error(`Error al actualizar inventario del producto ${item.productId}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      // ✅ VALIDACIÓN FINAL DE STOCK para todos los items
      for (const item of saleItems) {
        const availableStock = item.batch 
          ? item.batch.currentQuantity 
          : (productStocks.get(item.productId) || 0);
        
        if (item.quantity > availableStock) {
          throw new Error(`Stock insuficiente para ${item.product?.nameProduct}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
        }
      }

      // Calculate final totals
      const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = subtotal * (formData.discountPercentage / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (formData.taxPercentage / 100);
      const totalAmount = taxableAmount + taxAmount;

      // ✅ PREPARAR datos de venta
      const saleData: SaleRequest = {
        ...formData,
        userId: formData.userId,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
      };

      // ✅ Solo incluir clientId si tiene valor
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

      // ✅ GUARDAR detalles con batchId
      for (const item of saleItems) {
        const saleDetailData: SaleDetailRequest = {
          saleId: savedSale.id,
          productId: item.productId,
          batchId: item.batchId, // ✅ INCLUIR batchId
          quantity: item.quantity,
        };

        if (item.id && editingSale) {
          await saleDetailAPI.updateSaleDetail(item.id, saleDetailData);
        } else {
          await saleDetailAPI.createSaleDetail(saleDetailData);
        }
      }

      // ✅ CREAR movimientos de inventario solo para ventas nuevas
      if (!editingSale) {
        try {
          await createInventoryMovements(savedSale.id);
        } catch (invError) {
          console.error('Error al actualizar inventario:', invError);
          setError(`Venta guardada exitosamente, pero hubo un error al actualizar el inventario: ${invError instanceof Error ? invError.message : 'Error desconocido'}`);
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
    clients.push(newClient);
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
    ...products.map(product => {
      const stock = productStocks.get(product.id) || 0;
      return { 
        value: product.id, 
        label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'} (Stock: ${stock}) - ${formatCurrency(product.retailPrice || 0)}` 
      };
    })
  ];

  // ✅ NUEVO: Opciones de método de pago
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
    ...users.map(user => ({ value: user.id, label: `${user.name} (${user.email})` }))
  ];

  const saleTypeOptions: SelectOption[] = [
    { value: SaleType.RETAIL, label: 'Venta al Detalle' },
    { value: SaleType.WHOLESALE, label: 'Venta al Por Mayor' },
  ];

  // ✅ OPCIONES de lotes disponibles
  const batchOptions: SelectOption[] = [
    { value: '', label: 'Sin lote específico (se tomará el más antiguo)' },
    ...availableBatches.map(batch => ({ 
      value: batch.id.toString(), 
      label: `${batch.batchCode} (Disponible: ${batch.currentQuantity})` 
    }))
  ];

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
          {item.batch && (
            <div className="text-xs text-blue-600">
              Lote: {item.batch.batchCode} (Stock: {item.batch.currentQuantity})
            </div>
          )}
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
      render: (value) => (
        <span className="text-gray-700 font-medium">
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (value) => (
        <span className="text-gray-700 font-medium">
          {formatCurrency(value as number)}
        </span>
      ),
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

  const isUserValid = formData.userId && formData.userId.trim() !== '';

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
              onClick={() => setFormData(prev => ({ ...prev, saleNumber: generateSaleNumber() }))}
              className="text-[#7ca1eb] hover:text-[#6b90da]"
              title="Generar nuevo número"
            >
              🔄
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

          {/* ✅ NUEVO: Método de pago como dropdown */}
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
          {/* <Button
            type="button"
            variant="outline"
            onClick={() => setShowClientForm(true)}
            className="mt-6"
          >
            Nuevo Cliente
          </Button> */}
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
              setNewItem({ productId: 0, batchId: undefined, quantity: 1 });
              setAvailableBatches([]);
            }}
            title="Agregar Producto"
            size="md"
          >
            <div className="space-y-4">
              <Select
                label="Producto*"
                value={newItem.productId || 0}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setNewItem(prev => ({ ...prev, productId: parseInt(e.target.value) || 0 }))}
                options={productOptions}
                error={errors.newItemProduct}
              />

              {/* ✅ SELECCIÓN de lote (solo si hay lotes disponibles) */}
              {availableBatches.length > 0 && (
                <Select
                  label="Lote (Opcional - Si no selecciona, se tomará el más antiguo)"
                  value={newItem.batchId || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setNewItem(prev => ({ ...prev, batchId: e.target.value ? parseInt(e.target.value) : undefined }))}
                  options={batchOptions}
                />
              )}

              {availableBatches.length === 0 && newItem.productId && newItem.productId > 0 && (
                <Alert variant="warning">
                  No hay lotes disponibles para este producto en la tienda seleccionada
                </Alert>
              )}

              <Input
                label="Cantidad*"
                type="number"
                min="1"
                value={newItem.quantity || 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
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
                  disabled={!newItem.productId || availableBatches.length === 0}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
                error={errors.discountPercentage}
              />

              <Input
                label="Impuesto (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
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

      {/* Cliente Form Modal */}
      {/* <ClientForm
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSuccess={handleClientCreated}
      /> */}
    </Modal>
  );
};