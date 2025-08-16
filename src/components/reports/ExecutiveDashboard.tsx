// src/components/reports/ExecutiveDashboard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { formatters } from '@/utils/formatters';
import { reportsService } from '@/services/reportsService';
import { useAuthPermissions } from '@/hooks/useAuth';

// Executive Dashboard Response Types (based on backend structure)
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

interface TrendDataPoint {
  date: string;
  value: number;
}

interface DashboardTrendsResponse {
  salesTrend: TrendDataPoint[];
  revenueTrend: TrendDataPoint[];
  inventoryTrend: TrendDataPoint[];
}

interface DashboardAlertsResponse {
  lowStockCount: number;
  expiringBatchesCount: number;
  pendingReceiptsCount: number;
  systemAlerts: string[];
}

interface ExecutiveDashboardResponse {
  summary: DashboardSummaryResponse;
  kpis: DashboardKPIsResponse;
  trends: DashboardTrendsResponse;
  alerts: DashboardAlertsResponse;
}

// Component Props
interface ExecutiveDashboardProps {
  onClose?: () => void;
}

// Component State
interface ExecutiveDashboardState {
  data: ExecutiveDashboardResponse | null;
  loading: boolean;
  error: string | null;
  startDate: string;
  endDate: string;
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend }) => (
  <Card className="text-center p-6">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-[#7ca1eb] mb-1">{value}</div>
    <div className="text-sm text-gray-600 mb-2">{title}</div>
    {trend && (
      <Badge variant={trend.isPositive ? "success" : "danger"} className="text-xs">
        {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
      </Badge>
    )}
  </Card>
);

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  target?: string;
  status: 'good' | 'warning' | 'danger';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, target, status }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-sm font-medium">{title}</div>
      {target && <div className="text-xs opacity-75">Meta: {target}</div>}
    </div>
  );
};

// Trend Chart Component (simplified)
interface TrendChartProps {
  title: string;
  data: TrendDataPoint[];
  color: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ title, data, color }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-700">{title}</h4>
      <div className="h-32 flex items-end justify-between gap-1">
        {data.slice(-7).map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full ${color} rounded-t`}
              style={{
                height: `${(point.value / maxValue) * 100}%`,
                minHeight: '4px'
              }}
              title={`${formatters.date(point.date)}: ${formatters.currency(point.value)}`}
            />
            <div className="text-xs text-gray-500 mt-1">
              {new Date(point.date).getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-gray-500">
        Últimos 7 días
      </div>
    </div>
  );
};

// Alert Item Component
interface AlertItemProps {
  type: 'warning' | 'error' | 'info';
  message: string;
}

const AlertItem: React.FC<AlertItemProps> = ({ type, message }) => {
  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getAlertColor = (type: string): string => {
    switch (type) {
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'info': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border text-sm ${getAlertColor(type)}`}>
      <span className="mr-2">{getAlertIcon(type)}</span>
      {message}
    </div>
  );
};

// Main Component
export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onClose }) => {
  const { canAccessExecutiveReports } = useAuthPermissions();
  
  const [state, setState] = useState<ExecutiveDashboardState>({
    data: null,
    loading: false,
    error: null,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Check permissions
  if (!canAccessExecutiveReports) {
    return (
      <Alert variant="error">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-bold mb-2">Acceso Restringido</h3>
          <p>Solo los administradores pueden acceder al dashboard ejecutivo.</p>
        </div>
      </Alert>
    );
  }

  // Generate dashboard
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
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando dashboard',
        loading: false 
      }));
    }
  }, [state.startDate, state.endDate]);

  // Handle input changes
  const handleDateChange = (field: 'startDate' | 'endDate') => 
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setState(prev => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  // Export dashboard
  const handleExport = (): void => {
    if (!state.data) return;

    const csvData = [
      ['Dashboard Ejecutivo', state.data.summary.period],
      [''],
      ['Resumen Ejecutivo'],
      ['Ingresos Totales', state.data.summary.totalRevenue.toString()],
      ['Ventas Totales', state.data.summary.totalSales.toString()],
      ['Productos Totales', state.data.summary.totalProducts.toString()],
      ['Tiendas Activas', state.data.summary.activeStores.toString()],
      [''],
      ['KPIs Clave'],
      ['Ticket Promedio', state.data.kpis.averageTicket.toString()],
      ['Tasa de Conversión', `${state.data.kpis.conversionRate}%`],
      ['Rotación de Inventario', state.data.kpis.inventoryTurnover.toString()],
      ['Margen de Ganancia', `${state.data.kpis.profitMargin}%`],
      ['Retención de Clientes', `${state.data.kpis.customerRetention}%`],
      [''],
      ['Alertas del Sistema'],
      ['Stock Bajo', state.data.alerts.lowStockCount.toString()],
      ['Lotes por Vencer', state.data.alerts.expiringBatchesCount.toString()],
      ['Recibos Pendientes', state.data.alerts.pendingReceiptsCount.toString()],
    ];

    reportsService.exportToCSV(csvData, 'dashboard-ejecutivo');
  };

  // Auto-load on mount
  useEffect(() => {
    generateDashboard();
  }, [generateDashboard]);

  // Create summary cards
  const summaryCards = state.data ? [
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.summary.totalRevenue),
      icon: '💰'
    },
    {
      title: 'Ventas Totales',
      value: formatters.number(state.data.summary.totalSales),
      icon: '📊'
    },
    {
      title: 'Productos Activos',
      value: formatters.number(state.data.summary.totalProducts),
      icon: '📦'
    },
    {
      title: 'Tiendas Activas',
      value: formatters.number(state.data.summary.activeStores),
      icon: '🏪'
    }
  ] : [];

  // Create KPI cards
  const kpiCards = state.data ? [
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.kpis.averageTicket),
      status: state.data.kpis.averageTicket > 50 ? 'good' as const : 'warning' as const
    },
    {
      title: 'Tasa de Conversión',
      value: formatters.percentage(state.data.kpis.conversionRate),
      status: state.data.kpis.conversionRate > 2 ? 'good' as const : 'warning' as const
    },
    {
      title: 'Rotación de Inventario',
      value: state.data.kpis.inventoryTurnover.toFixed(1),
      status: state.data.kpis.inventoryTurnover > 4 ? 'good' as const : 'warning' as const
    },
    {
      title: 'Margen de Ganancia',
      value: formatters.percentage(state.data.kpis.profitMargin),
      status: state.data.kpis.profitMargin > 20 ? 'good' as const : 'warning' as const
    },
    {
      title: 'Retención de Clientes',
      value: formatters.percentage(state.data.kpis.customerRetention),
      status: state.data.kpis.customerRetention > 80 ? 'good' as const : 'warning' as const
    }
  ] : [];

  // Create alerts
  const alerts = state.data ? [
    ...(state.data.alerts.lowStockCount > 0 ? [{
      type: 'warning' as const,
      message: `${state.data.alerts.lowStockCount} productos con stock bajo`
    }] : []),
    ...(state.data.alerts.expiringBatchesCount > 0 ? [{
      type: 'error' as const,
      message: `${state.data.alerts.expiringBatchesCount} lotes próximos a vencer`
    }] : []),
    ...(state.data.alerts.pendingReceiptsCount > 0 ? [{
      type: 'info' as const,
      message: `${state.data.alerts.pendingReceiptsCount} recibos pendientes`
    }] : []),
    ...state.data.alerts.systemAlerts.map(alert => ({
      type: 'info' as const,
      message: alert
    }))
  ] : [];

  // Tabs configuration
  const tabsData = [
    {
      id: 'overview',
      label: 'Resumen Ejecutivo',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => (
              <SummaryCard key={index} {...card} />
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpiCards.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'trends',
      label: 'Tendencias',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {state.data && (
            <>
              <TrendChart
                title="Tendencia de Ventas"
                data={state.data.trends.salesTrend}
                color="bg-blue-500"
              />
              <TrendChart
                title="Tendencia de Ingresos"
                data={state.data.trends.revenueTrend}
                color="bg-green-500"
              />
              <TrendChart
                title="Tendencia de Inventario"
                data={state.data.trends.inventoryTrend}
                color="bg-purple-500"
              />
            </>
          )}
        </div>
      )
    },
    {
      id: 'alerts',
      label: `Alertas (${alerts.length})`,
      content: (
        <div className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <AlertItem key={index} {...alert} />
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-500">No hay alertas activas en el sistema.</p>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card title="Configuración del Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            value={state.startDate}
            onChange={handleDateChange('startDate')}
          />
          <Input
            label="Fecha Fin"
            type="date"
            value={state.endDate}
            onChange={handleDateChange('endDate')}
          />
          <div className="flex items-end gap-2">
            <Button onClick={generateDashboard} isLoading={state.loading}>
              Actualizar Dashboard
            </Button>
            {state.data && (
              <Button variant="outline" onClick={handleExport}>
                Exportar
              </Button>
            )}
          </div>
          {onClose && (
            <div className="flex items-end">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <Alert variant="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Period info */}
      {state.data && (
        <Alert variant="info">
          <div className="text-center">
            <strong>Dashboard Ejecutivo:</strong> {state.data.summary.period} | 
            <span className="ml-2">
              Ingresos: {formatters.currency(state.data.summary.totalRevenue)} | 
              Ventas: {formatters.number(state.data.summary.totalSales)}
            </span>
          </div>
        </Alert>
      )}

      {/* Dashboard Content */}
      {state.data && (
        <Card title="Dashboard Ejecutivo">
          <Tabs tabs={tabsData} defaultActiveTab="overview" />
        </Card>
      )}

      {/* Initial message */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Dashboard Ejecutivo</h3>
          <p className="text-gray-500 mb-4">
            Panel de control con métricas clave y KPIs del negocio.
          </p>
          <p className="text-sm text-gray-400">
            Selecciona el período y haz clic en "Actualizar Dashboard" para comenzar.
          </p>
        </div>
      )}
    </div>
  );
};