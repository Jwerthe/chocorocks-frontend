// src/components/users/UserActivityList.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { UserActivityModal } from './UserActivityModal';
import { UserResponse } from '@/types';
import { userActivityAPI } from '@/services/api';
import { formatters } from '@/utils/formatters';
import { useNotification } from '@/hooks/useNotification';

// 👇 Usa import RELATIVO; ajusta la ruta si tu estructura difiere
import {
  UserActivityResponse,
  UserActivityFilters,
  SelectOption,
  getActionTypeVariant,
  getTableDisplayName,
  calculateActivityStats,
} from '../../types/user-activity';

interface UserActivityListProps {
  users: UserResponse[];
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: unknown, row: T, index?: number) => React.ReactNode;
}

export const UserActivityList: React.FC<UserActivityListProps> = ({ users }) => {
  const [activities, setActivities] = useState<UserActivityResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<UserActivityResponse | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // ✅ Filtros simplificados (sin fechas porque el backend no las da)
  const [filters, setFilters] = useState<UserActivityFilters>({
    userId: '',
    actionType: '',
    tableAffected: '',
  });

  const { error: notifyError } = useNotification();

  // =========================
  // Data fetching
  // =========================
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await userActivityAPI.getAllActivities();
        if (alive) setActivities(data);
        console.log('✅ Activities loaded:', data.length, 'activities');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al cargar actividades de usuarios';
        if (alive) setError(errorMessage);
        notifyError(errorMessage);
        console.error('❌ Error fetching activities:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []); // <- sin dependencias inestables

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await userActivityAPI.getAllActivities();
      setActivities(data);
      console.log('🔄 Activities reloaded:', data.length);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar actividades de usuarios';
      setError(errorMessage);
      notifyError(errorMessage);
      console.error('❌ Error refetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  // =========================
  // UI handlers
  // =========================
  const handleViewDetails = useCallback((activity: UserActivityResponse): void => {
    setSelectedActivity(activity);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback((): void => {
    setShowModal(false);
    setSelectedActivity(null);
  }, []);

  const handleFilterChange = useCallback(
    (field: keyof UserActivityFilters, value: string): void => {
      setFilters((prev: UserActivityFilters) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback((): void => {
    setFilters({
      userId: '',
      actionType: '',
      tableAffected: '',
    });
  }, []);

  // =========================
  // Derived data (memoized)
  // =========================
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesUser =
        !filters.userId || activity.user.id.toString() === filters.userId;
      const matchesAction =
        !filters.actionType ||
        activity.actionType.toLowerCase().includes(filters.actionType.toLowerCase());
      const matchesTable =
        !filters.tableAffected ||
        (activity.tableAffected &&
          activity.tableAffected.toLowerCase().includes(filters.tableAffected.toLowerCase()));

      return matchesUser && matchesAction && matchesTable;
    });
  }, [activities, filters]);

  const uniqueActionTypes = useMemo(
    () => [...new Set(activities.map((a) => a.actionType).filter(Boolean))],
    [activities]
  );

  const uniqueTablesAffected = useMemo(
    () => [...new Set(activities.map((a) => a.tableAffected).filter(Boolean))],
    [activities]
  );

  const userOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Todos los usuarios' },
      ...users.map((user) => ({
        value: user.id.toString(),
        label: user.name,
      })),
    ],
    [users]
  );

  const actionTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Todas las acciones' },
      ...uniqueActionTypes.map((type) => ({
        value: type as string,
        label: type as string,
      })),
    ],
    [uniqueActionTypes]
  );

  const tableOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Todas las tablas' },
      ...uniqueTablesAffected.map((table) => ({
        value: table as string,
        label: table as string,
      })),
    ],
    [uniqueTablesAffected]
  );

  const columns: TableColumn<UserActivityResponse>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'Usuario',
        render: (_, activity: UserActivityResponse) => (
          <div>
            <div className="font-medium text-gray-800">{activity.user.name}</div>
            <div className="text-sm text-gray-500">{activity.user.email}</div>
            <div className="text-xs text-gray-400">ID: {activity.user.id}</div>
          </div>
        ),
      },
      {
        key: 'actionType',
        header: 'Acción',
        render: (_, activity: UserActivityResponse) => (
          <Badge variant={getActionTypeVariant(activity.actionType)}>
            {activity.actionType}
          </Badge>
        ),
      },
      {
        key: 'tableAffected',
        header: 'Tabla Afectada',
        render: (_, activity: UserActivityResponse) => (
          <span className="font-mono text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded">
            {getTableDisplayName(activity.tableAffected)}
          </span>
        ),
      },
      {
        key: 'recordId',
        header: 'ID Registro',
        render: (_, activity: UserActivityResponse) => (
          <span className="font-mono text-sm text-gray-700">
            {activity.recordId ?? 'N/A'}
          </span>
        ),
      },
      {
        key: 'description',
        header: 'Descripción',
        render: (_, activity: UserActivityResponse) => (
          <div className="max-w-xs">
            <span className="text-gray-700">
              {formatters.truncate(activity.description, 80)}
            </span>
          </div>
        ),
      },
      {
        key: 'id',
        header: 'ID Actividad',
        render: (_, activity: UserActivityResponse) => (
          <span className="font-mono text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded">
            #{activity.id}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (_, activity: UserActivityResponse) => (
          <Button size="sm" variant="outline" onClick={() => handleViewDetails(activity)}>
            {/* <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg> */}
            Ver Detalles
          </Button>
        ),
      },
    ],
    [handleViewDetails]
  );

  // =========================
  // Render
  // =========================
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ✅ Filtros */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Actividad</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Usuario"
            value={filters.userId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleFilterChange('userId', e.target.value)
            }
            options={userOptions}
          />

          <Select
            label="Tipo de Acción"
            value={filters.actionType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleFilterChange('actionType', e.target.value)
            }
            options={actionTypeOptions}
          />

          <Select
            label="Tabla Afectada"
            value={filters.tableAffected}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleFilterChange('tableAffected', e.target.value)
            }
            options={tableOptions}
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Mostrando {filteredActivities.length} de {activities.length} actividades
          </div>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* ✅ Estadísticas rápidas */}
      <div  >
        {(() => {
          const stats = calculateActivityStats(activities);
          return (
            <>
{/* ✅ Estadísticas rápidas con diseño de Cards */}
<div   className="
    grid gap-4
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-4
    auto-rows-fr
  ">
  <Card className="border-l-4 border-l-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Total Actividades</p>
        <p className="text-2xl font-bold text-blue-600">
          {stats.total}
        </p>
      </div>
      <div className="text-blue-500">
        {/* <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2 10a8 8 1116 0A8 8 0 012 10zm8-5a5 5 0 100 10A5 5 0 0010 5z" clipRule="evenodd" />
        </svg> */}
      </div>
    </div>
  </Card>

  <Card className="border-l-4 border-l-green-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Creaciones</p>
        <p className="text-2xl font-bold text-green-600">
          {stats.creates}
        </p>
      </div>
      <div className="text-green-500">
        {/* <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 1 110-16 8 8 0 010 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg> */}
      </div>
    </div>
  </Card>

  <Card className="border-l-4 border-l-yellow-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Actualizaciones</p>
        <p className="text-2xl font-bold text-yellow-600">
          {stats.updates}
        </p>
      </div>
      <div className="text-yellow-500">
        {/* <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 5a1 1 0 011 1v3.586l1.707 1.707a1 1 0 11-1.414 1.414L9 11.414V6a1 1 0 011-1z" />
          <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h4.5a.5.5 0 000-1H5a1 1 0 01-1-1V7h12v2.5a.5.5 0 001 0V5a2 2 0 00-2-2H5z" clipRule="evenodd" />
        </svg> */}
      </div>
    </div>
  </Card>

  <Card className="border-l-4 border-l-red-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Eliminaciones</p>
        <p className="text-2xl font-bold text-red-600">
          {stats.deletes}
        </p>
      </div>
      <div className="text-red-500">
        {/* <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H5.5a.5.5 0 000 1H6v10a2 2 0 002 2h4a2 2 0 002-2V5h.5a.5.5 0 000-1H12V3a1 1 0 00-1-1H9zm1 4a.75.75 0 011.5 0v7a.75.75 0 01-1.5 0V6zM8 6a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0V6zm6.5 0a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0V6z" clipRule="evenodd" />
        </svg> */}
      </div>
    </div>
  </Card>
</div>
</>
          );
        })()}
      </div>

      {/* ✅ Tabla de actividades */}
      <div className="bg-white rounded-lg border-2 border-gray-200">
        <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">
            Registro de Actividades ({filteredActivities.length})
          </h3>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <svg className="w-4 h-4 mr-2 animate-spin" style={{ animationPlayState: loading ? 'running' : 'paused' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </div>

        <div className="p-6 pt-4">
          <Table
            data={filteredActivities}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron actividades de usuarios"
          />
        </div>
      </div>

      {/* ✅ Modal de detalles */}
      <UserActivityModal isOpen={showModal} onClose={handleCloseModal} activity={selectedActivity} />
    </div>
  );
};
