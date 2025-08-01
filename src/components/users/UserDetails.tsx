// src/components/users/UserDetails.tsx
import React from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { UserResponse, IdentificationType, UserRole } from '@/types';
import { formatters } from '@/utils/formatters';

interface UserDetailsProps {
  user: UserResponse;
  className?: string;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ 
  user, 
  className = '' 
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

  const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ 
    label, 
    value 
  }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm font-medium text-gray-600 w-1/3">{label}:</span>
      <span className="text-sm text-gray-900 w-2/3 text-right">{value}</span>
    </div>
  );

  return (
    <Card className={className} title="Información del Usuario">
      <div className="space-y-0">
        <DetailRow
          label="ID"
          value={<span className="font-mono text-xs bg-gray-100 px-2 py-1">{user.id}</span>}
        />
        
        <DetailRow
          label="Nombre"
          value={<span className="font-medium text-gray-800">{user.name}</span>}
        />
        
        <DetailRow
          label="Email"
          value={<span className="text-blue-600">{user.email}</span>}
        />
        
        <DetailRow
          label="Rol"
          value={
            <Badge variant={getRoleVariant(user.role)}>
              {user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
            </Badge>
          }
        />
        
        <DetailRow
          label="Identificación"
          value={
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {getIdentificationTypeLabel(user.typeIdentification)}
              </div>
              <div className="font-mono text-gray-700">{user.identificationNumber}</div>
            </div>
          }
        />
        
        <DetailRow
          label="Teléfono"
          value={<span className='text-gray-800'>{user.phoneNumber || <span className="text-gray-600">No registrado</span>}</span>}
        />
        
        <DetailRow
          label="Estado"
          value={<StatusBadge status={user.isActive ? 'active' : 'inactive'} />}
        />
        
        <DetailRow
          label="Fecha de Registro"
          value={
            <div className="text-right">
              <div>{formatters.date(user.createdAt)}</div>
              <div className="text-xs text-gray-500">
                {formatters.dateTime(user.createdAt)}
              </div>
            </div>
          }
        />
        
        <DetailRow
          label="Última Actualización"
          value={
            <div className="text-right">
              <div>{formatters.date(user.updatedAt)}</div>
              <div className="text-xs text-gray-500">
                {formatters.dateTime(user.updatedAt)}
              </div>
            </div>
          }
        />
      </div>
    </Card>
  );
};