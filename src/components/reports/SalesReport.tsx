// src/components/reports/SalesReport.tsx (ACTUALIZADO - USAR REPORTS API)
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
import { SalesReportResponse, StoreResponse } from '@/types';
import { storeAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface SalesReportState {
  data: SalesReportResponse | null;
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
        setStores(storesData);
      } catch (error) {
        console.error('Error loading stores:', error);
      }
    };

    loadStores();
  }, []);

  // ✅ NUEVO: Usar endpoint directo de reports
  const generateReport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await reportsService.generateSalesReport(state.filters);
      setState(prev => ({ 
        ...prev, 
        data: report, 
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

    // ✅ USAR: Helper del reportsService
    const csvData = reportsService.formatSalesReportForCSV(state.data);
    reportsService.exportToCSV(csvData, 'reporte-ventas');
  };

  const summaryCards = state.data ? [
    {
      title: 'Total Ventas',
      value: state.data.totalSales.toString(),
      icon: '📊'
    },
    {
      title: 'Ingresos Totales',
      value: formatters.currency(state.data.totalRevenue),
      icon: '💰'
    },
    {
      title: 'Ticket Promedio',
      value: formatters.currency(state.data.averageTicket),
      icon: '🎯'
    },
    {
      title: 'Tiendas Activas',
      value: state.data.salesByStore.length.toString(),
      icon: '🏪'
    }
  ] : [];

  const storeColumns = [
    { key: 'storeName', header: 'Tienda' },
    { key: 'salesCount', header: 'Ventas' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
    }
  ];

  const productColumns = [
    { key: 'productName', header: 'Producto' },
    { key: 'quantitySold', header: 'Cantidad Vendida' },
    { 
      key: 'revenue', 
      header: 'Ingresos',
      render: (value: number) => formatters.currency(value)
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
          data={state.data?.salesByProduct || []}
          columns={productColumns}
          emptyMessage="No hay datos de productos vendidos"
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

      {/* Contenido del Reporte */}
      {state.data && (
        <Card title={`Reporte de Ventas - ${state.data.period}`}>
          <Tabs tabs={tabsData} defaultActiveTab="summary" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <p className="text-gray-500">Selecciona los filtros y haz clic en "Generar Reporte" para comenzar.</p>
        </div>
      )}
    </div>
  );
};