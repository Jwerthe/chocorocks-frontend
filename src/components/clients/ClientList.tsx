// src/components/clients/ClientList.tsx
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
import { ClientForm } from './ClientForm';
import { ClientResponse, IdentificationType } from '@/types';
import { clientAPI, ApiError } from '@/services/api';
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

interface ClientFilters {
  search: string;
  typeIdentification: IdentificationType | undefined;
  requiresInvoice: boolean | undefined;
  isActive: boolean | undefined;
}

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showClientForm, setShowClientForm] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<ClientResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; client: ClientResponse | null }>({
    show: false,
    client: null
  });
  
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    typeIdentification: undefined,
    requiresInvoice: undefined,
    isActive: undefined,
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  const fetchClients = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await clientAPI.getAllClients();
      setClients(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los clientes';
      setError(errorMessage);
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (client: ClientResponse): void => {
    setDeleteConfirm({ show: true, client });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm.client) return;

    try {
      await clientAPI.deleteClient(deleteConfirm.client.id);
      await fetchClients();
      setDeleteConfirm({ show: false, client: null });
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al eliminar el cliente. Verifique que no tenga ventas asociadas.';
      setError(errorMessage);
      setDeleteConfirm({ show: false, client: null });
      console.error('Error deleting client:', err);
    }
  };

  const handleEditClient = (client: ClientResponse): void => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleClientFormClose = (): void => {
    setShowClientForm(false);
    setEditingClient(null);
  };

  const handleClientFormSuccess = (): void => {
    fetchClients();
  };

  const clearFilters = (): void => {
    setFilters({
      search: '',
      typeIdentification: undefined,
      requiresInvoice: undefined,
      isActive: undefined,
    });
  };

  const handleRefresh = (): void => {
    fetchClients();
  };

  // Client-side filtering
  const filteredClients = clients.filter(client => {
    const matchesSearch = !filters.search || 
      client.nameLastname.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.identificationNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(filters.search.toLowerCase())) ||
      (client.phoneNumber && client.phoneNumber.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesType = !filters.typeIdentification || client.typeIdentification === filters.typeIdentification;
    const matchesInvoice = filters.requiresInvoice === undefined || client.requiresInvoice === filters.requiresInvoice;
    const matchesStatus = filters.isActive === undefined || client.isActive === filters.isActive;

    return matchesSearch && matchesType && matchesInvoice && matchesStatus;
  });

  const identificationTypeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    { value: IdentificationType.CEDULA, label: 'Cédula' },
    { value: IdentificationType.RUC, label: 'RUC' },
    { value: IdentificationType.PASAPORTE, label: 'Pasaporte' },
  ];

  const invoiceOptions: SelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'true', label: 'Requiere Factura' },
    { value: 'false', label: 'No Requiere Factura' },
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' },
  ];

  const getIdentificationTypeLabel = (type: IdentificationType): string => {
    switch (type) {
      case IdentificationType.CEDULA:
        return 'Cédula';
      case IdentificationType.RUC:
        return 'RUC';
      case IdentificationType.PASAPORTE:
        return 'Pasaporte';
      default:
        return type;
    }
  };

  const getIdentificationTypeVariant = (type: IdentificationType): 'primary' | 'secondary' | 'warning' => {
    switch (type) {
      case IdentificationType.CEDULA:
        return 'primary';
      case IdentificationType.RUC:
        return 'warning';
      case IdentificationType.PASAPORTE:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const columns: TableColumn<ClientResponse>[] = [
    {
      key: 'nameLastname',
      header: 'Nombre',
      render: (value: string) => <span className="font-medium text-gray-700">{value}</span>,
    },
    {
      key: 'identification',
      header: 'Identificación',
      render: (_: any, row: ClientResponse) => (
        <div>
          <div className="font-mono text-sm text-gray-600">{row.identificationNumber}</div>
          <Badge variant={getIdentificationTypeVariant(row.typeIdentification)} size="sm">
            {getIdentificationTypeLabel(row.typeIdentification)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Teléfono',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-700 font-mono">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-700 truncate block max-w-[180px]">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-600 max-w-xs truncate max-w-[200px]" title={value}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'requiresInvoice',
      header: 'Facturación',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'secondary'} size="sm">
          {value ? 'Sí' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'} size="sm">
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    // {
    //   key: 'createdAt',
    //   header: 'Registrado',
    //   render: (value: string) => (
    //     <span className="text-sm text-gray-500">
    //       {new Date(value).toLocaleDateString('es-ES', {
    //         year: 'numeric',
    //         month: 'short',
    //         day: 'numeric'
    //       })}
    //     </span>
    //   ),
    // },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: ClientResponse) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditClient(row)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Administra la base de datos de clientes de Chocorocks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            onClick={() => setShowClientForm(true)}
            className="w-full sm:w-auto"
          >
            + Nuevo Cliente
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
          title="Error al cargar Clientes"
          description="No se pudieron cargar los clientes. Verifica la conexión con el backend."
        />
      )}

      <Card title="Filtros de Búsqueda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por nombre, identificación, email..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Select
            options={identificationTypeOptions}
            value={filters.typeIdentification || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              typeIdentification: e.target.value as IdentificationType || undefined 
            }))}
          />
          
          <Select
            options={invoiceOptions}
            value={filters.requiresInvoice?.toString() || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              requiresInvoice: e.target.value === '' ? undefined : e.target.value === 'true' 
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredClients.length}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredClients.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Requieren Factura</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredClients.filter(c => c.requiresInvoice).length}
              </p>
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Email</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredClients.filter(c => c.email).length}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg text-gray-800 font-bold">
            Clientes ({filteredClients.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No hay clientes"
            description={
              clients.length === 0 
                ? "Aún no has registrado ningún cliente. ¡Comienza agregando tu primer cliente!"
                : "No se encontraron clientes con los filtros aplicados. Prueba ajustando los criterios de búsqueda."
            }
            action={{
              text: clients.length === 0 ? "Crear primer cliente" : "Limpiar filtros",
              onClick: clients.length === 0 ? () => setShowClientForm(true) : clearFilters
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={filteredClients}
              columns={columns}
              loading={false}
              emptyMessage="No se encontraron clientes"
            />
          </div>
        )}
      </Card>

      <ClientForm
        isOpen={showClientForm}
        onClose={handleClientFormClose}
        onSuccess={handleClientFormSuccess}
        editingClient={editingClient}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, client: null })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar el cliente "${deleteConfirm.client?.nameLastname}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};