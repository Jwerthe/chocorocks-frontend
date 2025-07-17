// src/components/stores/StoreList.tsx
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
import { StoreForm } from './StoreForm';
import { StoreResponse, UserResponse, StoreType } from '@/types';
import { storeAPI, userAPI, ApiError } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface StoreFilters {
  search: string;
  typeStore: StoreType | undefined;
  managerId: number | undefined;
  isActive: boolean | undefined;
}

export const StoreList: React.FC = () => {
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showStoreForm, setShowStoreForm] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<StoreResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; store: StoreResponse | null }>({
    show: false,
    store: null
  });
  
  const [filters, setFilters] = useState<StoreFilters>({
    search: '',
    typeStore: undefined,
    managerId: undefined,
    isActive: undefined,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    fetchStores();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  const fetchStores = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await storeAPI.getAllStores();
      setStores(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar las tiendas';
      setError(errorMessage);
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (): Promise<void> => {
    try {
      const data = await userAPI.getAllUsers();
      setUsers(data.filter(u => u.isActive));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleDeleteClick = (store: StoreResponse): void => {
    setDeleteConfirm({ show: true, store });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm.store) return;

    try {
      await storeAPI.deleteStore(deleteConfirm.store.id);
      await fetchStores();
      setDeleteConfirm({ show: false, store: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar la tienda. Verifique que no tenga datos asociados.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, store: null });
      console.error('Error deleting store:', err);
    }
  };

  const handleEditStore = (store: StoreResponse): void => {
    setEditingStore(store);
    setShowStoreForm(true);
  };

  const handleStoreFormClose = (): void => {
    setShowStoreForm(false);
    setEditingStore(null);
  };

  const handleStoreFormSuccess = (): void => {
    fetchStores();
  };

  const clearFilters = (): void => {
    setFilters({
      search: '',
      typeStore: undefined,
      managerId: undefined,
      isActive: undefined,
    });
  };

  const handleRefresh = (): void => {
    fetchStores();
    fetchUsers();
  };

  // Client-side filtering
  const filteredStores = stores.filter(store => {
    const matchesSearch = !filters.search || 
      store.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      store.address.toLowerCase().includes(filters.search.toLowerCase()) ||
      (store.phoneNumber && store.phoneNumber.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesType = !filters.typeStore || store.typeStore === filters.typeStore;
    const matchesManager = !filters.managerId || store.manager?.id === filters.managerId;
    const matchesStatus = filters.isActive === undefined || store.isActive === filters.isActive;

    return matchesSearch && matchesType && matchesManager && matchesStatus;
  });

  const typeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    { value: StoreType.FISICA, label: 'Tienda Física' },
    { value: StoreType.MOVIL, label: 'Tienda Móvil' },
    { value: StoreType.BODEGA, label: 'Bodega' },
  ];

  const managerOptions: SelectOption[] = [
    { value: '', label: 'Todos los gerentes' },
    { value: 'none', label: 'Sin gerente asignado' },
    ...users.map(user => ({ value: user.id, label: user.name }))
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Activas' },
    { value: 'false', label: 'Inactivas' },
  ];

  const getStoreTypeLabel = (type: StoreType): string => {
    switch (type) {
      case StoreType.FISICA:
        return 'Física';
      case StoreType.MOVIL:
        return 'Móvil';
      case StoreType.BODEGA:
        return 'Bodega';
      default:
        return type;
    }
  };

  const getStoreTypeVariant = (type: StoreType): 'primary' | 'secondary' | 'warning' => {
    switch (type) {
      case StoreType.FISICA:
        return 'primary';
      case StoreType.MOVIL:
        return 'warning';
      case StoreType.BODEGA:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return '-';
    return time;
  };

  const columns: TableColumn<StoreResponse>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'typeStore',
      header: 'Tipo',
      render: (value: StoreType) => (
        <Badge variant={getStoreTypeVariant(value)} size="sm">
          {getStoreTypeLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      render: (value: string) => (
        <span className="text-sm text-gray-600 max-w-xs truncate block" title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'manager',
      header: 'Gerente',
      render: (value: UserResponse | undefined) => (
        <span className="text-sm">
          {value ? value.name : (
            <span className="text-gray-400 italic">Sin asignar</span>
          )}
        </span>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Teléfono',
      render: (value: string | undefined) => (
        <span className="text-sm font-mono">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'schedule',
      header: 'Horario',
      render: (_: any, row: StoreResponse) => (
        <div className="text-sm">
          {row.scheduleOpen && row.scheduleClosed ? (
            <span>
              {formatTime(row.scheduleOpen)} - {formatTime(row.scheduleClosed)}
            </span>
          ) : (
            <span className="text-gray-400">Sin definir</span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'} size="sm">
          {value ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: StoreResponse) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditStore(row)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Tiendas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Administra las tiendas y puntos de venta de Chocorocks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            onClick={() => setShowStoreForm(true)}
            className="w-full sm:w-auto"
          >
            + Nueva Tienda
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
          title="Error al cargar Tiendas"
          description="No se pudieron cargar las tiendas. Verifica la conexión con el backend."
        />
      )}

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por nombre, dirección o teléfono..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={typeOptions}
            value={filters.typeStore || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              typeStore: e.target.value as StoreType || undefined 
            }))}
          />
          
          <Select
            options={managerOptions}
            value={filters.managerId ? (filters.managerId === -1 ? 'none' : filters.managerId.toString()) : ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              managerId: e.target.value === '' ? undefined : 
                       e.target.value === 'none' ? -1 : 
                       parseInt(e.target.value)
            }))}
          />
          
          <Select
            options={statusOptions}
            value={filters.isActive?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
            }))}
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
          <h2 className="text-lg font-bold">
            Tiendas ({filteredStores.length})
          </h2>
          <div className="text-sm text-gray-600">
            <span className="mr-4">
              <strong>Activas:</strong> {filteredStores.filter(s => s.isActive).length}
            </span>
            <span>
              <strong>Inactivas:</strong> {filteredStores.filter(s => !s.isActive).length}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredStores.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="No hay tiendas"
            description={
              stores.length === 0 
                ? "Aún no has registrado ninguna tienda. ¡Comienza agregando tu primera tienda!"
                : "No se encontraron tiendas con los filtros aplicados. Prueba ajustando los criterios de búsqueda."
            }
            action={{
              text: stores.length === 0 ? "Crear primera tienda" : "Limpiar filtros",
              onClick: stores.length === 0 ? () => setShowStoreForm(true) : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredStores}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron tiendas"
            />
          </div>
        )}
      </Card>

      <StoreForm
        isOpen={showStoreForm}
        onClose={handleStoreFormClose}
        onSuccess={handleStoreFormSuccess}
        editingStore={editingStore}
        users={users}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, store: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Tienda"
        message={`¿Estás seguro de que deseas eliminar la tienda "${deleteConfirm.store?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};