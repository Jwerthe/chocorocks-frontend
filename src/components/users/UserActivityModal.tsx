// src/components/users/UserActivityModal.tsx - CORREGIDO
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  UserActivityResponse,
  getActionTypeVariant,
  getTableDisplayName
} from '../../types/user-activity';

interface UserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: UserActivityResponse | null;
}

export const UserActivityModal: React.FC<UserActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
}) => {
  if (!activity) return null;

  const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ 
    label, 
    value 
  }) => (
    <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm font-medium text-gray-600 w-1/3">{label}:</span>
      <div className="w-2/3 text-right">{value}</div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de Actividad"
      size="lg"
    >
      <div className="space-y-6">
        {/* ✅ Información principal */}
        <Card title="Información General" className="border-2 border-gray-200">
          <div className="space-y-0">
            <DetailRow
              label="ID de Actividad"
              value={
                <span className="font-mono text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-md">
                  #{activity.id}
                </span>
              }
            />
            
            <DetailRow
              label="Usuario"
              value={
                <div className="text-right">
                  <div className="font-medium text-gray-800">{activity.user.name}</div>
                  <div className="text-sm text-gray-500">{activity.user.email}</div>
                  <div className="text-xs text-gray-400">
                    ID: {activity.user.id} | Rol: {activity.user.role}
                  </div>
                </div>
              }
            />
            
            <DetailRow
              label="Tipo de Acción"
              value={
                <Badge variant={getActionTypeVariant(activity.actionType)}>
                  {activity.actionType}
                </Badge>
              }
            />
          </div>
        </Card>

        {/* ✅ Información técnica corregida */}
        <Card title="Detalles Técnicos" className="border-2 border-gray-200">
          <div className="space-y-0">
            <DetailRow
              label="Tabla Afectada"
              value={
                <div className="text-right">
                  <div className="font-medium text-gray-800">
                    {getTableDisplayName(activity.tableAffected)}
                  </div>
                  {activity.tableAffected && (
                    <div className="font-mono text-xs text-gray-500 mt-1">
                      {activity.tableAffected}
                    </div>
                  )}
                </div>
              }
            />
            
            <DetailRow
              label="ID del Registro"
              value={
                activity.recordId ? (
                  <span className="font-mono text-sm bg-green-50 text-green-800 px-3 py-1 rounded-md">
                    {activity.recordId}
                  </span>
                ) : (
                  <span className="text-gray-500">No disponible</span>
                )
              }
            />
            
            <DetailRow
              label="Dirección IP"
              value={
                activity.ipAddress ? (
                  <span className="font-mono text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded">
                    {activity.ipAddress}
                  </span>
                ) : (
                  <span className="text-gray-500">No registrada</span>
                )
              }
            />
          </div>
        </Card>

        {/* ✅ Descripción detallada */}
        <Card title="Descripción de la Actividad" className="border-2 border-gray-200">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 leading-relaxed">
              {activity.description}
            </p>
          </div>
        </Card>

        {/* ✅ Información del navegador (solo si existe) */}
        {activity.userAgent && (
          <Card title="Información del Navegador" className="border-2 border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-mono break-all leading-relaxed">
                {activity.userAgent}
              </p>
            </div>
          </Card>
        )}

        {/* ✅ Contexto adicional mejorado */}
        <Card title="Contexto de la Acción" className="border-2 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Información del Usuario</h4>
              <div className="space-y-1">
                <div><span className="text-gray-600">Nombre:</span> <span className="font-medium text-gray-800">{activity.user.name}</span></div>
                <div><span className="text-gray-600">Email:</span> <span className="font-medium text-gray-800">{activity.user.email}</span></div>
                <div><span className="text-gray-600">Rol:</span> <span className="font-medium text-gray-800">{activity.user.role}</span></div>
                <div><span className="text-gray-600">ID Usuario:</span> <span className="font-mono text-xs text-gray-800">{activity.user.id}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Información de la Acción</h4>
              <div className="space-y-1">
                <div><span className="text-gray-600">ID Actividad:</span> <span className="font-mono text-xs text-gray-800">#{activity.id}</span></div>
                <div><span className="text-gray-600">Tabla:</span> <span className="font-medium text-gray-800">{getTableDisplayName(activity.tableAffected)}</span></div>
                {activity.recordId && (
                  <div><span className="text-gray-600">ID Registro:</span> <span className="font-mono text-xs text-gray-800">{activity.recordId}</span></div>
                )}
                {activity.ipAddress && (
                  <div><span className="text-gray-600">IP:</span> <span className="font-mono text-xs text-gray-800">{activity.ipAddress}</span></div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ✅ Botón de cerrar con mejor styling */}
        <div className="flex justify-end pt-4 border-t-2 border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};