// src/components/reports/ExecutiveDashboard.tsx (NUEVO)
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
import { ExecutiveDashboardResponse } from '@/types';
import { reportsService } from '@/services/reportsService';
import { useAuthPermissions } from '@/hooks/useAuth';

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
      `Período: ${state.data.period}`,
      '',
      'Métricas Principales',
      `Ingresos Totales,${formatters.currency(state.data.totalRevenue)}`,
      `Total Ventas,${state.data.totalSales}`,
      `Ticket Promedio,${formatters.currency(state.data.averageTicket)}`,
      `Margen de Utilidad,${formatters.percentage(state.data.profitMargin)}`,
      '',
      'Top Productos',
      'Producto,Ingresos,Cantidad Vendida',
      ...state.data.topProducts.map(product => 
        `${product.productName},${product.revenue},${product.quantitySold}`
      ),
      '',
      'Rendimiento por Tienda',
      'Tienda,Ventas,Ingresos,Utilidad',
      ...state.data.storePerformance.map(store => 
        `${store.storeName},${store.sales},${store.revenue},${store.profit}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard-ejecutivo-${Date.now()}.csv`;
    link.click();
  };

  const getMarginVariant = (margin: number): 'success' | 'warning' | 'danger' => {
    if (margin >= 30) return 'success';
    if (margin >= 15) return 'warning';
    return 'danger';
  };

  // KPIs principales
  const kpiCards = state.data ? [
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue),
      icon: '💰',
      subtitle: `${state.data.totalSales} ventas`,
      variant: 'primary' as const
    },
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.averageTicket),
      icon: '🎯',
      subtitle: 'Por venta',
      variant: 'secondary' as const
    },
    {
      title: 'Margen de Utilidad',
      value: formatters.percentage(state.data.profitMargin),
      icon: '📈',
      subtitle: 'Rentabilidad',
      variant: getMarginVariant(state.data.profitMargin)
    },
    {
      title: 'Ventas Totales',
      value: state.data.totalSales.toString(),
      icon: '📊',
      subtitle: 'Transacciones',
      variant: 'info' as const
    }
  ] : [];

  const topProductsColumns = [
    { key: 'productName', header: 'Producto' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'quantitySold', 
      header: 'Cantidad',
      render: (value: number) => formatters.number(value)
    }
  ];

  const storePerformanceColumns = [
    { key: 'storeName', header: 'Tienda' },
    { key: 'sales', header: 'Ventas' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    },
    { 
      key: 'profit', 
      header: 'Utilidad',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatters.currency(value)}
        </span>
      )
    }
  ];

  const overviewContent = state.data ? (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="text-center">
            <div className="text-3xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-bold text-[#7ca1eb] mb-1">{kpi.value}</div>
            <div className="text-sm font-medium text-gray-700">{kpi.title}</div>
            <div className="text-xs text-gray-500">{kpi.subtitle}</div>
          </Card>
        ))}
      </div>

      {/* Gráfico de tendencia de ventas simplificado */}
      <Card title="Tendencia de Ventas">
        <div className="space-y-3">
          {state.data.salesTrend.slice(-7).map((trend, index) => {
            const maxRevenue = Math.max(...state.data!.salesTrend.map(t => t.revenue));
            const percentage = (trend.revenue / maxRevenue) * 100;
            
            return (
              <div key={trend.date} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {formatters.date(trend.date, 'short')}
                  </span>
                  <div className="text-sm text-gray-600">
                    {trend.sales} ventas - {formatters.currency(trend.revenue)}
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

      {/* Alertas y recomendaciones */}
      <Card title="Alertas Ejecutivas">
        <div className="space-y-3">
          {state.data.profitMargin < 15 && (
            <Alert variant="warning">
              <strong>Margen Bajo:</strong> El margen de utilidad ({formatters.percentage(state.data.profitMargin)}) está por debajo del 15% recomendado.
            </Alert>
          )}
          
          {state.data.topProducts.length > 0 && (
            <Alert variant="info">
              <strong>Producto Estrella:</strong> {state.data.topProducts[0].productName} lidera las ventas con {formatters.currency(state.data.topProducts[0].revenue)} en ingresos.
            </Alert>
          )}

          {state.data.totalSales > 0 && (
            <Alert variant="success">
              <strong>Actividad:</strong> Se registraron {state.data.totalSales} ventas en el período analizado.
            </Alert>
          )}
        </div>
      </Card>
    </div>
  ) : null;

  const tabsData = [
    {
      id: 'overview',
      label: 'Resumen Ejecutivo',
      content: overviewContent
    },
    {
      id: 'products',
      label: 'Top Productos',
      content: (
        <Table
          data={state.data?.topProducts || []}
          columns={topProductsColumns}
          emptyMessage="No hay datos de productos"
        />
      )
    },
    {
      id: 'stores',
      label: 'Rendimiento Tiendas',
      content: (
        <Table
          data={state.data?.storePerformance || []}
          columns={storePerformanceColumns}
          emptyMessage="No hay datos de tiendas"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con indicador de rol */}
      <Alert variant="info">
        <div className="flex items-center justify-between">
          <div>
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

      {/* Contenido del Dashboard */}
      {state.data && (
        <Card title={`Dashboard Ejecutivo - ${state.data.period}`}>
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
            Este dashboard incluye KPIs financieros, análisis de productos y rendimiento por tienda.
          </p>
        </div>
      )}
    </div>
  );
};