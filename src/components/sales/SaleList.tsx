// src/components/sales/SaleList.tsx
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BackendErrorHandler } from '../common/BackendErrorHandler';
import { SaleForm } from './SaleForm';
import { SaleDetailModal } from './SaleDetailModal';
import { 
  SaleResponse, 
  StoreResponse, 
  ClientResponse,
  UserResponse,
  SaleType 
} from '@/types';
import { saleAPI, storeAPI, clientAPI, userAPI, ApiError } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

// Proper TypeScript interfaces
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

interface SaleFilters {
  search: string;
  storeId: number | undefined;
  saleType: SaleType | undefined;
  startDate: string;
  endDate: string;
  isInvoiced: boolean | undefined;
}

interface DeleteConfirmState {
  show: boolean;
  sale: SaleResponse | null;
}

interface SummaryStats {
  totalSales: number;
  totalAmount: number;
  averageAmount: number;
}

// Helper functions with proper typing
const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!isValidDate(dateString)) return 'Fecha inválida';
  
  try {
    return new Date(dateString!).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDisplayDate = (dateString: string | null | undefined): string => {
  if (!isValidDate(dateString)) return 'Fecha inválida';
  
  try {
    return new Date(dateString!).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Fecha inválida';
  }
};

export const SaleList: React.FC = () => {
  // State with proper typing
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showSaleForm, setShowSaleForm] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<SaleResponse | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    sale: null
  });
  
  const [filters, setFilters] = useState<SaleFilters>({
    search: '',
    storeId: undefined,
    saleType: undefined,
    startDate: '',
    endDate: '',
    isInvoiced: undefined,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  // Effect hooks with proper dependencies
  useEffect(() => {
    fetchSales();
    fetchStores();
    fetchClients();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch, filters.search]);

  // API functions with proper error handling
  const fetchSales = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await saleAPI.getAllSales();
      setSales(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar las ventas';
      setError(errorMessage);
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await storeAPI.getAllStores();
      setStores(data.filter((s: StoreResponse) => s.isActive));
    } catch (err) {
      console.error('Error al cargar tiendas:', err);
    }
  }, []);

  const fetchClients = useCallback(async (): Promise<void> => {
    try {
      const data = await clientAPI.getAllClients();
      setClients(data.filter((c: ClientResponse) => c.isActive));
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }, []);

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      const data = await userAPI.getAllUsers();
      setUsers(data.filter((u: UserResponse) => u.isActive));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  }, []);

  // Event handlers with proper typing
  const handleDeleteClick = useCallback((sale: SaleResponse): void => {
    setDeleteConfirm({ show: true, sale });
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteConfirm.sale) return;

    try {
      await saleAPI.deleteSale(deleteConfirm.sale.id);
      await fetchSales();
      setDeleteConfirm({ show: false, sale: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar la venta. Verifique que no tenga datos asociados.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, sale: null });
      console.error('Error deleting sale:', err);
    }
  }, [deleteConfirm.sale, fetchSales]);

  const handleEditSale = useCallback((sale: SaleResponse): void => {
    setEditingSale(sale);
    setShowSaleForm(true);
  }, []);

  const handleViewDetails = useCallback((sale: SaleResponse): void => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  }, []);

  const handleSaleFormClose = useCallback((): void => {
    setShowSaleForm(false);
    setEditingSale(null);
  }, []);

  const handleSaleFormSuccess = useCallback((): void => {
    fetchSales();
  }, [fetchSales]);

  const clearFilters = useCallback((): void => {
    setFilters({
      search: '',
      storeId: undefined,
      saleType: undefined,
      startDate: '',
      endDate: '',
      isInvoiced: undefined,
    });
  }, []);

  const handleRefresh = useCallback((): void => {
    fetchSales();
    fetchStores();
    fetchClients();
    fetchUsers();
  }, [fetchSales, fetchStores, fetchClients, fetchUsers]);

  // Input change handlers with proper typing
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
  }, []);

  const handleStoreChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilters(prev => ({ 
      ...prev, 
      storeId: event.target.value ? parseInt(event.target.value, 10) : undefined 
    }));
  }, []);

  const handleSaleTypeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilters(prev => ({ 
      ...prev, 
      saleType: (event.target.value as SaleType) || undefined 
    }));
  }, []);

  const handleStartDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setFilters(prev => ({ ...prev, startDate: event.target.value }));
  }, []);

  const handleEndDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setFilters(prev => ({ ...prev, endDate: event.target.value }));
  }, []);

  const handleInvoicedChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilters(prev => ({ 
      ...prev, 
      isInvoiced: event.target.value === '' ? undefined : event.target.value === 'true' 
    }));
  }, []);

  // Filtering logic with safe date handling
  const filteredSales = sales.filter((sale: SaleResponse): boolean => {
    const matchesSearch = !filters.search || 
      sale.saleNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      sale.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (sale.client?.nameLastname?.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesStore = !filters.storeId || sale.store.id === filters.storeId;
    const matchesSaleType = !filters.saleType || sale.saleType === filters.saleType;
    const matchesInvoiced = filters.isInvoiced === undefined || sale.isInvoiced === filters.isInvoiced;
    
    // Safe date comparison with validation
    let matchesStartDate = true;
    let matchesEndDate = true;
    
    if (filters.startDate || filters.endDate) {
      const saleDate = safeFormatDate(sale.createdAt);
      if (saleDate) {
        matchesStartDate = !filters.startDate || saleDate >= filters.startDate;
        matchesEndDate = !filters.endDate || saleDate <= filters.endDate;
      }
    }

    return matchesSearch && matchesStore && matchesSaleType && matchesInvoiced && 
           matchesStartDate && matchesEndDate;
  });

  // Summary calculations with proper typing
  const summaryStats: SummaryStats = {
    totalSales: filteredSales.length,
    totalAmount: filteredSales.reduce((sum: number, sale: SaleResponse) => sum + Number(sale.totalAmount), 0),
    averageAmount: filteredSales.length > 0 
      ? filteredSales.reduce((sum: number, sale: SaleResponse) => sum + Number(sale.totalAmount), 0) / filteredSales.length 
      : 0
  };

  // Select options with proper typing
  const storeOptions: SelectOption[] = [
    { value: '', label: 'Todas las tiendas' },
    ...stores.map((store: StoreResponse) => ({ value: store.id, label: store.name }))
  ];

  const saleTypeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    { value: SaleType.RETAIL, label: 'Venta al Detalle' },
    { value: SaleType.WHOLESALE, label: 'Venta al Por Mayor' },
  ];

  const invoicedOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Facturadas' },
    { value: 'false', label: 'Sin Facturar' },
  ];

  // Table columns with proper typing
  const columns: TableColumn<SaleResponse>[] = [
    {
      key: 'saleNumber',
      header: 'Número de Venta',
      render: (value: unknown): React.ReactNode => (
        <span className="font-mono text-sm text-gray-800 font-bold">{String(value)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (value: unknown): React.ReactNode => (
        <span className="text-sm text-gray-700">
          {formatDisplayDate(String(value))}
        </span>
      ),
    },
    {
      key: 'user.name',
      header: 'Vendedor',
      render: (value: unknown): React.ReactNode => (
        <span className="font-medium text-sm text-gray-700">{String(value)}</span>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (value: unknown, row: SaleResponse): React.ReactNode => (
        <span className="text-sm text-gray-700">
          {row.client ? row.client.nameLastname : 'Cliente General'}
        </span>
      ),
    },
    {
      key: 'store.name',
      header: 'Tienda',
      render: (value: unknown, row: SaleResponse): React.ReactNode => (
        <Badge variant="secondary" size="sm">{row.store.name}</Badge>
      ),
    },
    {
      key: 'saleType',
      header: 'Tipo',
      render: (value: unknown): React.ReactNode => {
        const saleType = value as SaleType;
        return (
          <Badge 
            variant={saleType === SaleType.RETAIL ? 'primary' : 'secondary'} 
            size="sm"
          >
            {saleType === SaleType.RETAIL ? 'Detalle' : 'Mayorista'}
          </Badge>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (value: unknown): React.ReactNode => (
        <span className="font-bold text-green-600">
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: 'isInvoiced',
      header: 'Facturado',
      render: (value: unknown): React.ReactNode => {
        const isInvoiced = Boolean(value);
        return (
          <Badge variant={isInvoiced ? 'success' : 'warning'} size="sm">
            {isInvoiced ? 'Sí' : 'No'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: unknown, row: SaleResponse): React.ReactNode => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(row)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEditSale(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Ventas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Administra las ventas y facturación de Chocorocks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            onClick={() => setShowSaleForm(true)}
            className="w-full sm:w-auto"
          >
            + Nueva Venta
          </Button>
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
          title="Error al cargar Ventas"
          description="No se pudieron cargar las ventas. Verifica la conexión con el backend."
        />
      )}

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            placeholder="Buscar por número, vendedor o cliente..."
            value={filters.search}
            onChange={handleSearchChange}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={storeOptions}
            value={filters.storeId?.toString() || ''}
            onChange={handleStoreChange}
          />
          
          <Select
            options={saleTypeOptions}
            value={filters.saleType || ''}
            onChange={handleSaleTypeChange}
          />

          <Input
            type="date"
            placeholder="Fecha desde"
            value={filters.startDate}
            onChange={handleStartDateChange}
          />

          <Input
            type="date"
            placeholder="Fecha hasta"
            value={filters.endDate}
            onChange={handleEndDateChange}
          />
          
          <Select
            options={invoicedOptions}
            value={filters.isInvoiced?.toString() || ''}
            onChange={handleInvoicedChange}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryStats.totalSales}
              </p>
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
              <p className="text-sm text-gray-600">Monto Total</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summaryStats.totalAmount)}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Promedio por Venta</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(summaryStats.averageAmount)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg text-gray-800 font-bold">
            Ventas ({filteredSales.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredSales.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" />
              </svg>
            }
            title="No hay ventas"
            description={
              sales.length === 0 
                ? "Aún no has registrado ninguna venta. ¡Comienza registrando tu primera venta!"
                : "No se encontraron ventas con los filtros aplicados. Prueba ajustando los criterios de búsqueda."
            }
            action={{
              text: sales.length === 0 ? "Registrar primera venta" : "Limpiar filtros",
              onClick: sales.length === 0 ? () => setShowSaleForm(true) : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredSales}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron ventas"
            />
          </div>
        )}
      </Card>

      <SaleForm
        isOpen={showSaleForm}
        onClose={handleSaleFormClose}
        onSuccess={handleSaleFormSuccess}
        editingSale={editingSale}
        stores={stores}
        clients={clients}
        users={users}
      />

      {selectedSale && (
        <SaleDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          sale={selectedSale}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, sale: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Venta"
        message={`¿Estás seguro de que deseas eliminar la venta "${deleteConfirm.sale?.saleNumber}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};