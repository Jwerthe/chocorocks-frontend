// src/app/reports/page.tsx (ACTUALIZADO - AGREGAR DASHBOARD EJECUTIVO)
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ReportCardProps } from '@/types/reports';
import { useAuthPermissions } from '@/hooks/useAuth';

// Import report components
import { SalesReport } from '@/components/reports/SalesReport';
import { InventoryReport } from '@/components/reports/InventoryReport';
import { ProfitabilityReport } from '@/components/reports/ProfitabilityReport';
import { TopProductsReport } from '@/components/reports/TopProductsReport';
import { TraceabilityReport } from '@/components/reports/TraceabilityReport';
import { ExecutiveDashboard } from '@/components/reports/ExecutiveDashboard';

type ReportType = 'sales' | 'inventory' | 'profitability' | 'top-products' | 'traceability' | 'executive-dashboard' | null;

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  component: React.ComponentType<{ onClose?: () => void }>;
  icon: React.ReactNode;
  requiresAdmin?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, onClick, disabled = false }) => {
  return (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${disabled ? 'opacity-50' : ''}`}>
      <div className="p-2" onClick={disabled ? undefined : onClick}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        <Button 
          size="sm" 
          variant="primary"
          disabled={disabled}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (!disabled) onClick();
          }}
        >
          Ver Reporte
        </Button>
      </div>
    </Card>
  );
};

export default function ReportsPage(): JSX.Element {
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const { isAdmin, canAccessReports, canAccessExecutiveReports } = useAuthPermissions();

  const reportsConfig: ReportConfig[] = [
    {
      id: 'sales',
      title: 'Reporte de Ventas',
      description: 'Análisis de ventas por período, productos y tiendas.',
      component: SalesReport,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'inventory',
      title: 'Reporte de Inventario',
      description: 'Estado actual del inventario y rotación de productos.',
      component: InventoryReport,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'profitability',
      title: 'Reporte de Rentabilidad',
      description: 'Análisis de costos vs ingresos por producto y tienda.',
      component: ProfitabilityReport,
      requiresAdmin: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      id: 'top-products',
      title: 'Productos Más Vendidos',
      description: 'Ranking de productos con mayor demanda y participación de mercado.',
      component: TopProductsReport,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      id: 'traceability',
      title: 'Reporte de Trazabilidad',
      description: 'Seguimiento completo de lotes desde producción hasta venta.',
      component: TraceabilityReport,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    // ✅ NUEVO: Dashboard Ejecutivo (solo ADMIN)
    {
      id: 'executive-dashboard',
      title: 'Dashboard Ejecutivo',
      description: 'Vista ejecutiva con métricas clave y análisis estratégico.',
      component: ExecutiveDashboard,
      requiresAdmin: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const handleCloseReport = (): void => {
    setActiveReport(null);
  };

  // Filtrar reportes según permisos
  const availableReports = reportsConfig.filter(report => {
    if (report.requiresAdmin && !isAdmin) {
      return false;
    }
    return canAccessReports;
  });

  const activeReportConfig = reportsConfig.find(config => config.id === activeReport);

  // Verificar si el usuario puede acceder al reporte seleccionado
  const canAccessActiveReport = activeReportConfig 
    ? (!activeReportConfig.requiresAdmin || isAdmin)
    : true;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Análisis y reportes del sistema</p>
        </div>

        {/* ✅ NUEVA: Información sobre permisos */}
        <Alert variant="info">
          <div className="text-center">
            <h3 className="font-bold mb-2">Módulos de Análisis Disponibles</h3>
            <p>
              {isAdmin 
                ? 'Como administrador, tienes acceso completo a todos los reportes incluyendo rentabilidad y dashboard ejecutivo.'
                : 'Tienes acceso a reportes operacionales. Los reportes de rentabilidad requieren permisos de administrador.'
              }
            </p>
          </div>
        </Alert>

        {/* Alertas de permisos si es necesario */}
        {!canAccessReports && (
          <Alert variant="warning">
            <div className="text-center">
              <h3 className="font-bold mb-2">Acceso Restringido</h3>
              <p>No tienes permisos para acceder a los reportes. Contacta al administrador.</p>
            </div>
          </Alert>
        )}

        {/* Grid de reportes */}
        {canAccessReports && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableReports.map((report) => (
              <ReportCard
                key={report.id}
                title={report.title}
                description={report.description}
                onClick={() => setActiveReport(report.id)}
              />
            ))}
          </div>
        )}

        {/* ✅ NUEVA: Información adicional para empleados */}
        {!isAdmin && canAccessReports && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-2">💡 Reportes Adicionales</h4>
            <p className="text-blue-700 text-sm">
              Los reportes de <strong>Rentabilidad</strong> y <strong>Dashboard Ejecutivo</strong> 
              están disponibles solo para administradores. Si necesitas acceso a estos reportes, 
              contacta a tu supervisor.
            </p>
          </div>
        )}
      </div>

      {/* Modal para mostrar reporte */}
      {activeReport && activeReportConfig && canAccessActiveReport && (
        <Modal
          isOpen={!!activeReport}
          onClose={handleCloseReport}
          title={activeReportConfig.title}
          size="xl"
        >
          <activeReportConfig.component onClose={handleCloseReport} />
        </Modal>
      )}

      {/* Modal de error de permisos */}
      {activeReport && activeReportConfig && !canAccessActiveReport && (
        <Modal
          isOpen={!!activeReport}
          onClose={handleCloseReport}
          title="Acceso Denegado"
          size="md"
        >
          <div className="text-center py-8">
            <div className="text-red-500 text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Permisos Insuficientes</h3>
            <p className="text-gray-600 mb-4">
              Este reporte requiere permisos de administrador para acceder.
            </p>
            <Button onClick={handleCloseReport}>
              Entendido
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}