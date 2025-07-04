// src/components/ui/StatusBadge.tsx
import React from 'react';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'expired' | 'low' | 'critical' | 'normal';
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { variant: 'success' as const, text: 'Activo' };
      case 'inactive':
        return { variant: 'secondary' as const, text: 'Inactivo' };
      case 'pending':
        return { variant: 'warning' as const, text: 'Pendiente' };
      case 'expired':
        return { variant: 'danger' as const, text: 'Vencido' };
      case 'low':
        return { variant: 'warning' as const, text: 'Bajo' };
      case 'critical':
        return { variant: 'danger' as const, text: 'Crítico' };
      case 'normal':
        return { variant: 'success' as const, text: 'Normal' };
      default:
        return { variant: 'secondary' as const, text: status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant}>
      {children || config.text}
    </Badge>
  );
};