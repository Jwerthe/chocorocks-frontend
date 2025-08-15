// src/components/reports/ExecutiveDashboard.tsx - CORREGIDO (Estructura Real del Backend)
'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatters } from '@/utils/formatters';
import { ReportProps } from '@/types/reports';
import { reportsService } from '@/services/reportsService';
import { useAuthPermissions } from '@/hooks/useAuth';

// ✅ NUEVA: Estructura real según el backend
interface ExecutiveDashboardResponse {
  summary: DashboardSummaryResponse;
  kpis: DashboardKPIsResponse;
  trends: DashboardTrendsResponse;
  alerts: DashboardAlertsResponse;
}

interface DashboardSummaryResponse {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  activeStores: number;
  period: string;
}

interface DashboardKPIsResponse {
  averageTicket: number;
  conversionRate: number;
  inventoryTurnover: number;
  profitMargin: number;
  customerRetention: number;
}

interface DashboardTrendsResponse {
  salesTrend: TrendDataPoint[];
  revenueTrend: TrendDataPoint[];
  inventoryTrend: TrendDataPoint[];
}

interface TrendDataPoint {
  date: string; // LocalDate se serializa como string
  value: number;
}

interface DashboardAlertsResponse {
  lowStockCount: number;
  expiringBatchesCount: number;
  pendingReceiptsCount: number;
  systemAlerts: string[];
}

interface ExecutiveDashboardState {
  data: ExecutiveDashboardResponse | null;
  loading: boolean;
  error: string | null;
  startDate: string;
  endDate: string;
}

export const ExecutiveDashboard: React.FC<ReportProps> = ({ onClose }) => {
  const { isAdmin, canAccessExecutiveReports } = useAuthPermissions();
  
  const [state, setState] = useState<ExecutiveDashboardState>({
    data: null,
    loading: false,
    error: null,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Verificar permisos
  if (!canAccessExecutiveReports) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Acceso Restringido</h3>
        <p className="text-gray-600 mb-4">
          El Dashboard Ejecutivo está disponible solo para administradores.
        </p>
        <Button onClick={onClose}>
          Volver
        </Button>
      </div>
    );
  }

  const generateDashboard = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const dashboard = await reportsService.generateExecutiveDashboard(
        state.startDate,
        state.endDate
      );
      setState(prev => ({ 
        ...prev, 
        data: dashboard, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando dashboard ejecutivo',
        loading: false 
      }));
    }
  }, [state.startDate, state.endDate]);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string): void => {
    setState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    const csvContent = [
      'Dashboard Ejecutivo',
      `Período: ${state.data.summary?.period || `${state.startDate} - ${state.endDate}`}`,
      '',
      'Resumen',
      `Ingresos Totales,${formatters.currency(state.data.summary?.totalRevenue || 0)}`,
      `Total Ventas,${state.data.summary?.totalSales || 0}`,
      `Total Productos,${state.data.summary?.totalProducts || 0}`,
      `Tiendas Activas,${state.data.summary?.activeStores || 0}`,
      '',
      'KPIs',
      `Ticket Promedio,${formatters.currency(state.data.kpis?.averageTicket || 0)}`,
      `Tasa de Conversión,${formatters.percentage(state.data.kpis?.conversionRate || 0)}`,
      `Rotación de Inventario,${formatters.number(state.data.kpis?.inventoryTurnover || 0)}`,
      `Margen de Utilidad,${formatters.percentage(state.data.kpis?.profitMargin || 0)}`,
      `Retención de Clientes,${formatters.percentage(state.data.kpis?.customerRetention || 0)}`,
      '',
      'Alertas',
      `Stock Bajo,${state.data.alerts?.lowStockCount || 0}`,
      `Lotes por Vencer,${state.data.alerts?.expiringBatchesCount || 0}`,
      `Recibos Pendientes,${state.data.alerts?.pendingReceiptsCount || 0}`,
      '',
      'Tendencia de Ventas',
      'Fecha,Valor',
      ...(state.data.trends?.salesTrend || []).map(trend => 
        `${trend.date || ''},${trend.value || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard-ejecutivo-${Date.now()}.csv`;
    link.click();
  };

  // ✅ CORREGIDO: Función segura para determinar variante de margen
  const getMarginVariant = (margin: number | null | undefined): 'success' | 'warning' | 'danger' => {
    const validMargin = margin || 0;
    if (validMargin >= 30) return 'success';
    if (validMargin >= 15) return 'warning';
    return 'danger';
  };

  const getKPIVariant = (value: number | null | undefined, thresholds: { good: number; warning: number }): 'success' | 'warning' | 'danger' => {
    const validValue = value || 0;
    if (validValue >= thresholds.good) return 'success';
    if (validValue >= thresholds.warning) return 'warning';
    return 'danger';
  };

  // ✅ CORREGIDO: KPIs según estructura real del backend
  const summaryCards = state.data ? [
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.summary?.totalRevenue || 0),
      icon: '💰',
      subtitle: `${formatters.number(state.data.summary?.totalSales || 0)} ventas`,
      variant: 'primary' as const
    },
    {
      title: 'Productos Activos',
      value: formatters.number(state.data.summary?.totalProducts || 0),
      icon: '📦',
      subtitle: 'En catálogo',
      variant: 'secondary' as const
    },
    {
      title: 'Tiendas Activas',
      value: formatters.number(state.data.summary?.activeStores || 0),
      icon: '🏪',
      subtitle: 'Operativas',
      variant: 'info' as const
    },
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.kpis?.averageTicket || 0),
      icon: '🎯',
      subtitle: 'Por venta',
      variant: 'success' as const
    }
  ] : [];

  // ✅ NUEVO: KPIs detallados
  const kpiCards = state.data?.kpis ? [
    {
      title: 'Margen de Utilidad',
      value: formatters.percentage(state.data.kpis.profitMargin || 0),
      icon: '📈',
      variant: getMarginVariant(state.data.kpis.profitMargin),
      description: 'Rentabilidad general'
    },
    {
      title: 'Tasa de Conversión',
      value: formatters.percentage(state.data.kpis.conversionRate || 0),
      icon: '🎯',
      variant: getKPIVariant(state.data.kpis.conversionRate, { good: 15, warning: 10 }),
      description: 'Visitantes que compran'
    },
    {
      title: 'Rotación de Inventario',
      value: formatters.number(state.data.kpis.inventoryTurnover || 0, 1),
      icon: '🔄',
      variant: getKPIVariant(state.data.kpis.inventoryTurnover, { good: 6, warning: 4 }),
      description: 'Veces por período'
    },
    {
      title: 'Retención de Clientes',
      value: formatters.percentage(state.data.kpis.customerRetention || 0),
      icon: '👥',
      variant: getKPIVariant(state.data.kpis.customerRetention, { good: 80, warning: 60 }),
      description: 'Clientes que regresan'
    }
  ] : [];

  // ✅ NUEVO: Tabla de tendencias
  const trendsColumns = [
    { 
      key: 'date', 
      header: 'Fecha',
      render: (value: string) => <span className="text-gray-700">{formatters.date(value)}</span>
    },
    { 
      key: 'value', 
      header: 'Valor',
      render: (value: number) => <span className="text-gray-700 font-medium">{formatters.number(value || 0)}</span>
    }
  ];

  const alertsContent = state.data?.alerts ? (
    <div className="space-y-4">
      {/* Alertas numéricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatters.number(state.data.alerts.lowStockCount || 0)}
          </div>
          <div className="text-sm text-gray-600">Productos con Stock Bajo</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatters.number(state.data.alerts.expiringBatchesCount || 0)}
          </div>
          <div className="text-sm text-gray-600">Lotes por Vencer</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl mb-2">📄</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatters.number(state.data.alerts.pendingReceiptsCount || 0)}
          </div>
          <div className="text-sm text-gray-600">Recibos Pendientes</div>
        </Card>
      </div>

      {/* Alertas del sistema */}
      {state.data.alerts.systemAlerts && state.data.alerts.systemAlerts.length > 0 && (
        <Card title="Alertas del Sistema">
          <div className="space-y-2">
            {state.data.alerts.systemAlerts.map((alert, index) => (
              <Alert key={index} variant="warning">
                <span className="text-gray-700">{alert}</span>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Estado general */}
      <Card title="Estado General del Sistema">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <div className="text-sm text-gray-600 mb-1">Operaciones</div>
            <div className="text-lg font-bold text-green-600">
              {(state.data.alerts.lowStockCount || 0) === 0 ? 'Normal' : 'Requiere Atención'}
            </div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-gray-600 mb-1">Inventario</div>
            <div className="text-lg font-bold text-blue-600">
              {(state.data.alerts.expiringBatchesCount || 0) === 0 ? 'Estable' : 'Revisar Vencimientos'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-gray-500">No hay alertas disponibles.</p>
    </div>
  );

  const overviewContent = state.data ? (
    <div className="space-y-6">
      {/* Resumen principal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <Card key={index} className="text-center">
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-[#7ca1eb] mb-1">{card.value}</div>
            <div className="text-sm font-medium text-gray-700">{card.title}</div>
            <div className="text-xs text-gray-500">{card.subtitle}</div>
          </Card>
        ))}
      </div>

      {/* KPIs detallados */}
      <Card title="Indicadores Clave de Rendimiento (KPIs)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, index) => (
            <div key={index} className="text-center p-4 border border-gray-200 rounded">
              <div className="text-2xl mb-2">{kpi.icon}</div>
              <Badge variant={kpi.variant} className="mb-2">
                {kpi.value}
              </Badge>
              <div className="text-sm font-medium text-gray-700 mb-1">{kpi.title}</div>
              <div className="text-xs text-gray-500">{kpi.description}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tendencias visuales */}
      {state.data.trends?.salesTrend && state.data.trends.salesTrend.length > 0 && (
        <Card title="Tendencia de Ventas">
          <div className="space-y-3">
            {state.data.trends.salesTrend.slice(-7).map((trend, index) => {
              const maxValue = Math.max(...state.data!.trends!.salesTrend.map(t => t.value || 0));
              const percentage = maxValue > 0 ? ((trend.value || 0) / maxValue) * 100 : 0;
              
              return (
                <div key={trend.date || index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {formatters.date(trend.date, 'short')}
                    </span>
                    <div className="text-sm text-gray-600">
                      {formatters.number(trend.value || 0)}
                    </div>
                  </div>
                  <ProgressBar 
                    value={percentage} 
                    max={100} 
                    variant="primary"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  ) : null;

  const tabsData = [
    {
      id: 'overview',
      label: 'Resumen Ejecutivo',
      content: overviewContent
    },
    {
      id: 'kpis',
      label: 'KPIs Detallados',
      content: state.data?.kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kpiCards.map((kpi, index) => (
            <Card key={index} title={kpi.title} className="text-center">
              <div className="text-4xl mb-4">{kpi.icon}</div>
              <div className="text-3xl font-bold mb-2">
                <Badge variant={kpi.variant} className="text-lg px-4 py-2">
                  {kpi.value}
                </Badge>
              </div>
              <p className="text-gray-600">{kpi.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">No hay KPIs disponibles</p>
      )
    },
    {
      id: 'trends',
      label: 'Tendencias',
      content: (
        <div className="space-y-6">
          {state.data?.trends?.salesTrend && (
            <Card title="Tendencia de Ventas">
              <Table
                data={state.data.trends.salesTrend || []}
                columns={trendsColumns}
                emptyMessage="No hay datos de tendencias de ventas"
              />
            </Card>
          )}
          
          {state.data?.trends?.revenueTrend && (
            <Card title="Tendencia de Ingresos">
              <Table
                data={state.data.trends.revenueTrend.map(trend => ({
                  ...trend,
                  value: formatters.currency(trend.value || 0)
                })) || []}
                columns={[
                  { 
                    key: 'date', 
                    header: 'Fecha',
                    render: (value: string) => <span className="text-gray-700">{formatters.date(value)}</span>
                  },
                  { 
                    key: 'value', 
                    header: 'Ingresos',
                    render: (value: string) => <span className="text-gray-700 font-medium">{value}</span>
                  }
                ]}
                emptyMessage="No hay datos de tendencias de ingresos"
              />
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'alerts',
      label: `Alertas (${(state.data?.alerts?.lowStockCount || 0) + (state.data?.alerts?.expiringBatchesCount || 0) + (state.data?.alerts?.pendingReceiptsCount || 0)})`,
      content: alertsContent
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con indicador de rol */}
      <Alert variant="info">
        <div className="flex items-center justify-between">
          <div className="text-gray-700 mr-4">
            <strong>👑 Dashboard Ejecutivo</strong> - Vista exclusiva para administradores
          </div>
          <Badge variant="success">ADMIN</Badge>
        </div>
      </Alert>

      {/* Filtros */}
      <Card title="Período de Análisis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            value={state.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleDateChange('startDate', e.target.value)
            }
          />
          <Input
            label="Fecha Fin"
            type="date"
            value={state.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleDateChange('endDate', e.target.value)
            }
          />
          <div className="flex items-end gap-2">
            <Button onClick={generateDashboard} isLoading={state.loading}>
              Generar Dashboard
            </Button>
            {state.data && (
              <Button variant="outline" onClick={handleExport}>
                Exportar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <Alert variant="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Información del período */}
      {state.data?.summary && (
        <Alert variant="info">
          <div className="text-center text-gray-700">
            <strong>Dashboard Generado:</strong> {state.data.summary.period} | 
            Ingresos: {formatters.currency(state.data.summary.totalRevenue || 0)} | 
            Ventas: {formatters.number(state.data.summary.totalSales || 0)} | 
            Margen: {formatters.percentage(state.data.kpis?.profitMargin || 0)}
          </div>
        </Alert>
      )}

      {/* Contenido del Dashboard */}
      {state.data && (
        <Card title={`Dashboard Ejecutivo - ${state.data.summary?.period || 'Período Seleccionado'}`}>
          <Tabs tabs={tabsData} defaultActiveTab="overview" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Dashboard Ejecutivo</h3>
          <p className="text-gray-500 mb-4">
            Selecciona el período de análisis y genera el dashboard con métricas clave del negocio.
          </p>
          <p className="text-sm text-gray-400">
            Este dashboard incluye KPIs financieros, tendencias de ventas y alertas del sistema.
          </p>
        </div>
      )}
    </div>
  );
};