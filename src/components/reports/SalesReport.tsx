// src/components/reports/SalesReport.tsx - CORREGIDO
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { formatters } from '@/utils/formatters';
import { ReportProps, ReportFilters } from '@/types/reports';
import { StoreResponse } from '@/types';
import { SalesReportResponse } from '@/types/reports';
import { storeAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface SalesReportState {
  data: import('@/types/reports').SalesReportResponse | null; // Especificar explícitamente el tipo de reports
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
}

export const SalesReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<SalesReportState>({
    data: null,
    loading: false,
    error: null,
    filters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    }
  });

  const [stores, setStores] = useState<StoreResponse[]>([]);

  // Cargar tiendas al montar
  useEffect(() => {
    const loadStores = async (): Promise<void> => {
      try {
        const storesData = await storeAPI.getAllStores();
        setStores(storesData || []);
      } catch (error) {
        console.error('Error loading stores:', error);
      }
    };

    loadStores();
  }, []);

  // Generar reporte usando endpoint directo de reports
  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await reportsService.generateSalesReport(state.filters);
      setState(prev => ({ 
        ...prev, 
        data: report as any, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando reporte',
        loading: false 
      }));
    }
  }, [state.filters]);

  const handleFilterChange = (key: keyof ReportFilters, value: string): void => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value || undefined
      }
    }));
  };

  const handleExport = (): void => {
    if (!state.data) return;

    const csvData = reportsService.formatSalesReportForCSV(state.data as any);
    reportsService.exportToCSV(csvData, 'reporte-ventas');
  };

  // ✅ CORREGIDO: Validación de datos antes de crear summaryCards
  const summaryCards = state.data ? [
    {
      title: 'Total Ventas',
      value: formatters.number(state.data.totalSales || 0),
      icon: '📊'
    },
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue || 0),
      icon: '💰'
    },
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.averageTicket || 0),
      icon: '🎯'
    },
    {
      title: 'Tiendas Activas',
      value: formatters.number((state.data.salesByStore || []).length),
      icon: '🏪'
    }
  ] : [];

  // ✅ CORREGIDO: Columnas con colores de texto mejorados
  const storeColumns = [
    { 
      key: 'storeName', 
      header: 'Tienda',
      render: (value: string) => <span className="text-gray-700 font-medium">{value || 'N/A'}</span>
    },
    { 
      key: 'salesCount', 
      header: 'Ventas',
      render: (value: number) => <span className="text-gray-700">{formatters.number(value || 0)}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700 font-medium">{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'percentage', 
      header: 'Participación',
      render: (value: number) => (
        <Badge variant="primary">
          {formatters.percentage(value || 0)}
        </Badge>
      )
    }
  ];

  const productColumns = [
    { 
      key: 'productName', 
      header: 'Producto',
      render: (value: string) => <span className="text-gray-700 font-medium">{value || 'N/A'}</span>
    },
    { 
      key: 'quantitySold', 
      header: 'Cantidad Vendida',
      render: (value: number) => <span className="text-gray-700">{formatters.number(value || 0)}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700 font-medium">{formatters.currency(value || 0)}</span>
    }
  ];

  const dailySalesColumns = [
    { 
      key: 'date', 
      header: 'Fecha',
      render: (value: string) => <span className="text-gray-700">{formatters.date(value)}</span>
    },
    { 
      key: 'salesCount', 
      header: 'Ventas',
      render: (value: number) => <span className="text-gray-700">{formatters.number(value ||0)}</span>
    },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => <span className="text-gray-700 font-medium">{formatters.currency(value || 0)}</span>
    }
  ];

  const tabsData = [
    {
      id: 'summary',
      label: 'Resumen',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => (
              <Card key={index} className="text-center">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-2xl font-bold text-[#7ca1eb]">{card.value}</div>
                <div className="text-sm text-gray-600">{card.title}</div>
              </Card>
            ))}
          </div>

          {/* ✅ NUEVO: Gráfico visual de ventas por tipo si existe */}
          {state.data?.salesByType && (
            <Card title="Ventas por Tipo">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {formatters.number(state.data.salesByType.retail?.count || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Ventas al Por Menor</div>
                  <div className="text-xs text-green-600">
                    {formatters.currency(state.data.salesByType.retail?.revenue || 0)}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {formatters.number(state.data.salesByType.wholesale?.count || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Ventas al Por Mayor</div>
                  <div className="text-xs text-blue-600">
                    {formatters.currency(state.data.salesByType.wholesale?.revenue || 0)}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'stores',
      label: 'Por Tienda',
      content: (
        <Table
          data={state.data?.salesByStore || []}
          columns={storeColumns}
          emptyMessage="No hay datos de ventas por tienda"
        />
      )
    },
    {
      id: 'products',
      label: 'Por Producto',
      content: (
        <Table
          data={state.data?.topSellingProducts || []}
          columns={productColumns}
          emptyMessage="No hay datos de productos vendidos"
        />
      )
    },
    {
      id: 'daily',
      label: 'Ventas Diarias',
      content: (
        <Table
          data={state.data?.dailySales || []}
          columns={dailySalesColumns}
          emptyMessage="No hay datos de ventas diarias"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card title="Filtros del Reporte">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            value={state.filters.startDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('startDate', e.target.value)
            }
          />
          <Input
            label="Fecha Fin"
            type="date"
            value={state.filters.endDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('endDate', e.target.value)
            }
          />
          <Select
            label="Tienda"
            value={state.filters.storeId?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              handleFilterChange('storeId', e.target.value)
            }
            options={[
              { value: '', label: 'Todas las tiendas' },
              ...stores.map((store: StoreResponse) => ({
                value: store.id.toString(),
                label: store.name
              }))
            ]}
          />
          <div className="flex items-end gap-2">
            <Button onClick={generateReport} isLoading={state.loading}>
              Generar Reporte
            </Button>
            {state.data && (
              <Button variant="outline" onClick={handleExport}>
                Exportar CSV
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

      {/* Información del reporte */}
      {state.data && (
        <Alert variant="info">
          <div className="text-center text-gray-700">
            <strong>Reporte Generado:</strong> {state.data.period || `${state.filters.startDate} - ${state.filters.endDate}`} | 
            Total ventas: {formatters.number(state.data.totalSales || 0)} | 
            Ingresos: {formatters.currency(state.data.totalRevenue || 0)}
          </div>
        </Alert>
      )}

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title={`Reporte de Ventas - ${state.data.period || 'Período Seleccionado'}`}>
          <Tabs tabs={tabsData} defaultActiveTab="summary" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Reporte de Ventas</h3>
          <p className="text-gray-500 mb-4">Selecciona los filtros y haz clic en "Generar Reporte" para comenzar.</p>
          <p className="text-sm text-gray-400">
            Este reporte incluye análisis de ventas por tienda, productos y tendencias diarias.
          </p>
        </div>
      )}
    </div>
  );
};