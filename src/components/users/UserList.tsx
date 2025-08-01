// src/components/users/UserList.tsx
import React from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { UserResponse, IdentificationType, UserRole } from '@/types';
import { formatters } from '@/utils/formatters';

interface UserListProps {
  users: UserResponse[];
  loading: boolean;
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
  currentUserId: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  const getRoleVariant = (role: UserRole): 'primary' | 'secondary' => {
    return role === 'ADMIN' ? 'primary' : 'secondary';
  };

  const getIdentificationTypeLabel = (type: IdentificationType): string => {
    const labels = {
      [IdentificationType.CEDULA]: 'Cédula',
      [IdentificationType.PASAPORTE]: 'Pasaporte',
      [IdentificationType.RUC]: 'RUC',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (value: string, user: UserResponse) => (
        <div>
          <div className="font-medium text-gray-800">{value}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (value: UserRole) => (
        <Badge variant={getRoleVariant(value)}>
          {value === 'ADMIN' ? 'Administrador' : 'Empleado'}
        </Badge>
      ),
    },
    {
      key: 'typeIdentification',
      header: 'Identificación',
      render: (value: IdentificationType, user: UserResponse) => (
        <div>
          <div className="text-sm text-gray-600">
            {getIdentificationTypeLabel(value)}
          </div>
          <div className="font-medium text-gray-700">{user.identificationNumber}</div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Teléfono',
      render: (value: string | undefined) => (
        <span className='text-gray-800'>{value || '-'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: boolean) => (
        <StatusBadge status={value ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha Registro',
      render: (value: string) => (
        <span className="text-sm text-gray-700">{formatters.date(value)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, user: UserResponse) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(user)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Button>
          
          {/* No permitir eliminar el usuario actual */}
          {user.id.toString() !== currentUserId && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(user)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg text-gray-800 font-bold">
          {loading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}`}
        </h3>
      </div>

      <Table
        data={users}
        columns={columns}
        loading={loading}
        emptyMessage="No se encontraron usuarios registrados"
      />
    </div>
  );
};