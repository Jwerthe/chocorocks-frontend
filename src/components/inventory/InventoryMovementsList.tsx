// src/components/inventory/InventoryMovementsList.tsx (NUEVO)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { 
  InventoryMovementResponse, 
  StoreResponse, 
  ProductResponse,
  MovementType,
  MovementReason,
  UserResponse
} from '@/types';
import { 
  inventoryMovementAPI, 
  storeAPI, 
  productAPI, 
  userAPI,
  ApiError 
} from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  translateMovementType, 
  translateMovementReason 
} from '@/utils/movement-translations';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface MovementFilters {
  search: string;
  movementType: MovementType | undefined;
  reason: MovementReason | undefined;
  storeId: number | undefined;
  productId: number | undefined;
  startDate: string;
  endDate: string;
  userId: number | undefined;
}

export const InventoryMovementsList: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovementResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const [filters, setFilters] = useState<MovementFilters>({
    search: '',
    movementType: undefined,
    reason: undefined,
    storeId: undefined,
    productId: undefined,
    startDate: '',
    endDate: '',
    userId: undefined,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  const fetchMovements = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      console.log('📋 Cargando movimientos de inventario...');
      const data = await inventoryMovementAPI.getAllMovements();
      console.log(`✅ ${data.length} movimientos cargados`);
      setMovements(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los movimientos de inventario';
      setError(errorMessage);
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter(s => s.isActive));
    } catch (err) {
      console.error('Error al cargar tiendas:', err);
    }
  }, []);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.filter(p => p.isActive));
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }, []);

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      const data = await userAPI.getAllUsers();
      setUsers(data.filter(u => u.isActive));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
    fetchStores();
    fetchProducts();
    fetchUsers();
  }, [fetchMovements, fetchStores, fetchProducts, fetchUsers]);

  const handleRefresh = useCallback((): void => {
    fetchMovements();
    fetchStores();
    fetchProducts();
    fetchUsers();
  }, [fetchMovements, fetchStores, fetchProducts, fetchUsers]);

  const handleFilterChange = (field: keyof MovementFilters, value: string | number | undefined): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = (): void => {
    setFilters({
      search: '',
      movementType: undefined,
      reason: undefined,
      storeId: undefined,
      productId: undefined,
      startDate: '',
      endDate: '',
      userId: undefined,
    });
  };

  // Helper functions
  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!isValidDate(dateString)) return 'Fecha inválida';
    
    try {
      const date = new Date(dateString!);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatDisplayDateOnly = (dateString: string | null | undefined): string => {
    if (!isValidDate(dateString)) return 'Fecha inválida';
    
    try {
      const date = new Date(dateString!);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return 'Fecha inválida';
    }
  };

  const getMovementTypeVariant = (type: MovementType): 'success' | 'warning' | 'danger' => {
    switch (type) {
      case MovementType.IN: return 'success';
      case MovementType.OUT: return 'danger';
      case MovementType.TRANSFER: return 'warning';
      default: return 'warning';
    }
  };

  // Filtering logic
  const filteredMovements = movements.filter((movement: InventoryMovementResponse): boolean => {
  const q = filters.search?.toLowerCase() || '';

  const matchesSearch: boolean =
    !q ||
    (movement.product.nameProduct?.toLowerCase().includes(q)) ||
    (movement.user.name?.toLowerCase().includes(q)) ||
    ((movement.batch?.batchCode ?? '').toLowerCase().includes(q)) ||
    ((movement.notes ?? '').toLowerCase().includes(q));

  const matchesType: boolean = !filters.movementType || movement.movementType === filters.movementType;
  const matchesReason: boolean = !filters.reason || movement.reason === filters.reason;
  const matchesProduct: boolean = !filters.productId || movement.product.id === filters.productId;
  const matchesUser: boolean = !filters.userId || movement.user.id === filters.userId;

  // Store: puede ser fromStore o toStore
  const matchesStore: boolean =
    !filters.storeId ||
    movement.fromStore?.id === filters.storeId ||
    movement.toStore?.id === filters.storeId;

  // Fechas -> siempre boolean
  let matchesStartDate: boolean = true;
  let matchesEndDate: boolean = true;

  if (filters.startDate || filters.endDate) {
    const movementDate = new Date(movement.movementDate).toISOString().split('T')[0];
    if (filters.startDate) matchesStartDate = movementDate >= filters.startDate;
    if (filters.endDate)   matchesEndDate   = movementDate <= filters.endDate;
  }

    return !!(matchesSearch && matchesType && matchesReason && matchesProduct && 
          matchesUser && matchesStore && matchesStartDate && matchesEndDate);
  });

  // Select options
  const storeOptions: SelectOption[] = [
    { value: '', label: 'Todas las tiendas' },
    ...stores.map((store: StoreResponse) => ({ value: store.id, label: store.name }))
  ];

  const productOptions: SelectOption[] = [
    { value: '', label: 'Todos los productos' },
    ...products.map((product: ProductResponse) => ({ 
      value: product.id, 
      label: `${product.nameProduct} - ${product.flavor || 'Sin sabor'}` 
    }))
  ];

  const userOptions: SelectOption[] = [
    { value: '', label: 'Todos los usuarios' },
    ...users.map((user: UserResponse) => ({ value: user.id, label: user.name }))
  ];

  const movementTypeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    { value: MovementType.IN, label: 'Entradas' },
    { value: MovementType.OUT, label: 'Salidas' },
    { value: MovementType.TRANSFER, label: 'Transferencias' },
  ];

  const reasonOptions: SelectOption[] = [
    { value: '', label: 'Todos los motivos' },
    { value: MovementReason.PRODUCTION, label: 'Producción' },
    { value: MovementReason.SALE, label: 'Venta' },
    { value: MovementReason.TRANSFER, label: 'Transferencia' },
    { value: MovementReason.ADJUSTMENT, label: 'Ajuste' },
    { value: MovementReason.DAMAGE, label: 'Daño' },
    { value: MovementReason.EXPIRED, label: 'Vencido' },
  ];

  // Table columns
  const columns: TableColumn<InventoryMovementResponse>[] = [
    {
      key: 'movementDate',
      header: 'Fecha y Hora',
      render: (value: unknown): React.ReactNode => (
        <span className="text-sm text-gray-700 font-mono">
          {formatDisplayDate(String(value))}
        </span>
      ),
    },
    {
      key: 'movementType',
      header: 'Tipo',
      render: (value: unknown): React.ReactNode => {
        const type = value as MovementType;
        return (
          <Badge variant={getMovementTypeVariant(type)} size="sm">
            {translateMovementType(type)}
          </Badge>
        );
      },
    },
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: unknown, row: InventoryMovementResponse): React.ReactNode => (
        <div>
          <div className="font-medium text-gray-800">{String(value)}</div>
          <div className="text-sm text-gray-600">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
          {row.batch && (
            <div className="text-xs text-blue-600 font-mono">
              Lote: {row.batch.batchCode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (value: unknown, row: InventoryMovementResponse): React.ReactNode => (
        <span className={`font-bold text-lg ${
          row.movementType === MovementType.IN ? 'text-green-600' : 
          row.movementType === MovementType.OUT ? 'text-red-600' : 'text-blue-600'
        }`}>
          {row.movementType === MovementType.OUT ? '-' : 
           row.movementType === MovementType.IN ? '+' : '↔'}
          {Number(value)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (value: unknown): React.ReactNode => (
        <Badge variant="secondary" size="sm">
          {translateMovementReason(value as MovementReason)}
        </Badge>
      ),
    },
    {
      key: 'stores',
      header: 'Tiendas',
      render: (value: unknown, row: InventoryMovementResponse): React.ReactNode => (
        <div className="text-sm">
          {row.movementType === MovementType.TRANSFER ? (
            <div>
              <div className="text-gray-600">
                De: <span className="font-medium">{row.fromStore?.name || 'Bodega Central'}</span>
              </div>
              <div className="text-gray-600">
                A: <span className="font-medium">{row.toStore?.name || 'Bodega Central'}</span>
              </div>
            </div>
          ) : row.movementType === MovementType.IN ? (
            <div className="text-gray-600">
              Destino: <span className="font-medium">{row.toStore?.name || 'Bodega Central'}</span>
            </div>
          ) : (
            <div className="text-gray-600">
              Origen: <span className="font-medium">{row.fromStore?.name || 'Bodega Central'}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'user.name',
      header: 'Usuario',
      render: (value: unknown): React.ReactNode => (
        <span className="text-sm text-gray-700 font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notas',
      render: (value: unknown): React.ReactNode => (
        <span className="text-sm text-gray-600">
          {value ? String(value) : '-'}
        </span>
      ),
    },
  ];

  // Summary calculations
  const summaryStats = {
    totalMovements: filteredMovements.length,
    entries: filteredMovements.filter(m => m.movementType === MovementType.IN).length,
    exits: filteredMovements.filter(m => m.movementType === MovementType.OUT).length,
    transfers: filteredMovements.filter(m => m.movementType === MovementType.TRANSFER).length,
    totalQuantityIn: filteredMovements
      .filter(m => m.movementType === MovementType.IN)
      .reduce((sum, m) => sum + m.quantity, 0),
    totalQuantityOut: filteredMovements
      .filter(m => m.movementType === MovementType.OUT)
      .reduce((sum, m) => sum + m.quantity, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historial de Movimientos</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Registro completo de entradas, salidas y transferencias de inventario
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            variant="secondary"
            onClick={handleRefresh}
            className="w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <BackendErrorHandler 
          error={error}
          onRetry={handleRefresh}
          title="Error al cargar Movimientos"
          description="No se pudieron cargar los movimientos de inventario. Verifica la conexión con el backend."
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Movimientos</p>
              <p className="text-2xl font-bold text-blue-600">{summaryStats.totalMovements}</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entradas</p>
              <p className="text-2xl font-bold text-green-600">{summaryStats.entries}</p>
              <p className="text-xs text-green-500">+{summaryStats.totalQuantityIn} unidades</p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Salidas</p>
              <p className="text-2xl font-bold text-red-600">{summaryStats.exits}</p>
              <p className="text-xs text-red-500">-{summaryStats.totalQuantityOut} unidades</p>
            </div>
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transferencias</p>
              <p className="text-2xl font-bold text-yellow-600">{summaryStats.transfers}</p>
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por producto, usuario, lote..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={movementTypeOptions}
            value={filters.movementType || ''}
            onChange={(e) => handleFilterChange('movementType', e.target.value as MovementType || undefined)}
          />
          
          <Select
            options={reasonOptions}
            value={filters.reason || ''}
            onChange={(e) => handleFilterChange('reason', e.target.value as MovementReason || undefined)}
          />

          <Select
            options={productOptions}
            value={filters.productId?.toString() || ''}
            onChange={(e) => handleFilterChange('productId', e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <Select
            options={storeOptions}
            value={filters.storeId?.toString() || ''}
            onChange={(e) => handleFilterChange('storeId', e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <Select
            options={userOptions}
            value={filters.userId?.toString() || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <Input
            type="date"
            placeholder="Fecha desde"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />

          <Input
            type="date"
            placeholder="Fecha hasta"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg text-gray-800 font-bold">
            Movimientos de Inventario ({filteredMovements.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" />
              </svg>
            }
            title="No hay movimientos"
            description={
              movements.length === 0 
                ? "Aún no se han registrado movimientos de inventario."
                : "No se encontraron movimientos con los filtros aplicados."
            }
            action={{
              text: movements.length === 0 ? "Ir a gestión de inventario" : "Limpiar filtros",
              onClick: movements.length === 0 ? () => window.location.href = '/inventory' : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredMovements}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron movimientos"
            />
          </div>
        )}
      </Card>
    </div>
  );
};