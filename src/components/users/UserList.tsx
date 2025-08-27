// src/components/users/UserList.tsx - Updated with Tabs
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { UserActivityList } from './UserActivityList';
import { UserResponse, IdentificationType, UserRole } from '@/types';
import { formatters } from '@/utils/formatters';

interface UserListProps {
  users: UserResponse[];
  loading: boolean;
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
  currentUserId: string;
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T, index?: number) => React.ReactNode;
}

enum UserTab {
  USERS = 'users',
  ACTIVITIES = 'activities'
}

export const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<UserTab>(UserTab.USERS);

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

  const renderTabButton = (tab: UserTab, label: string, icon: React.ReactNode) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
        activeTab === tab
          ? 'border-[#7ca1eb] text-[#7ca1eb]'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const columns: TableColumn<UserResponse>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (value: unknown, user: UserResponse) => (
        <div>
          <div className="font-medium text-gray-800">{value as string}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (value: unknown) => (
        <Badge variant={getRoleVariant(value as UserRole)}>
          {value === 'ADMIN' ? 'Administrador' : 'Empleado'}
        </Badge>
      ),
    },
    {
      key: 'typeIdentification',
      header: 'Identificación',
      render: (value: unknown, user: UserResponse) => (
        <div>
          <div className="text-sm text-gray-600">
            {getIdentificationTypeLabel(value as IdentificationType)}
          </div>
          <div className="font-medium text-gray-700">{user.identificationNumber}</div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Teléfono',
      render: (value: unknown) => (
        <span className='text-gray-800'>{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (value: unknown) => (
        <StatusBadge status={value as boolean ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha Registro',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{formatters.date(value as string)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (value: unknown, user: UserResponse) => (
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
    <Card>
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {renderTabButton(
            UserTab.USERS,
            'Lista de Usuarios',
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          )}
          {renderTabButton(
            UserTab.ACTIVITIES,
            'Registro de Actividades',
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === UserTab.USERS ? (
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
        ) : (
          <UserActivityList users={users} />
        )}
      </div>
    </Card>
  );
};