// src/components/reports/TraceabilityReport.tsx (ACTUALIZADO - USAR REPORTS API)
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatters } from '@/utils/formatters';
import { ReportProps } from '@/types/reports';
import { TraceabilityReportResponse, ProductResponse, ProductBatchResponse } from '@/types';
import { productAPI, productBatchAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

interface TraceabilityReportState {
  data: TraceabilityReportResponse | null;
  loading: boolean;
  error: string | null;
  searchBatchCode: string;
  selectedProductId: number | null;
}

export const TraceabilityReport: React.FC<ReportProps> = ({ onClose }) => {
  const [state, setState] = useState<TraceabilityReportState>({
    data: null,
    loading: false,
    error: null,
    searchBatchCode: '',
    selectedProductId: null
  });

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [batches, setBatches] = useState<ProductBatchResponse[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      try {
        const [productsData, batchesData] = await Promise.all([
          productAPI.getAllProducts(),
          productBatchAPI.getAllBatches()
        ]);
        setProducts(productsData);
        setBatches(batchesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // ✅ NUEVO: Usar endpoint directo de reports
  const generateReport = useCallback(async (batchCode?: string): Promise<void> => {
    const searchCode = batchCode || state.searchBatchCode;
    
    if (!searchCode.trim()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Por favor ingresa un código de lote para realizar la trazabilidad' 
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const report = await reportsService.generateTraceabilityReport(searchCode);
      setState(prev => ({ 
        ...prev, 
        data: report, 
        loading: false,
        searchBatchCode: searchCode // Actualizar con el código usado
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando reporte de trazabilidad',
        loading: false 
      }));
    }
  }, [state.searchBatchCode]);

  const handleBatchCodeChange = (value: string): void => {
    setState(prev => ({ ...prev, searchBatchCode: value }));
  };

  const handleBatchSelect = (batchCode: string): void => {
    setState(prev => ({ ...prev, searchBatchCode: batchCode }));
    generateReport(batchCode);
  };

  const handleProductChange = (productId: string): void => {
    setState(prev => ({
      ...prev,
      selectedProductId: productId ? parseInt(productId) : null
    }));
  };

  const handleExport = (): void => {
    if (!state.data || !state.data.batchInfo) return;

    const csvContent = [
      'Reporte de Trazabilidad',
      `Lote: ${state.data.batchInfo.batchCode}`,
      `Producto: ${state.data.batchInfo.productName}`,
      `Fecha Producción: ${state.data.batchInfo.productionDate}`,
      `Fecha Vencimiento: ${state.data.batchInfo.expirationDate}`,
      '',
      'Resumen',
      `Cantidad Producida,${state.data.summary.totalProduced}`,
      `Cantidad Vendida,${state.data.summary.totalSold}`,
      `Cantidad Transferida,${state.data.summary.totalMoved}`,
      `Cantidad Restante,${state.data.summary.remaining}`,
      '',
      'Movimientos de Inventario',
      'Fecha,Tipo,Cantidad,Razón,Desde,Hacia,Usuario,Notas',
      ...state.data.movements.map(movement => 
        `${movement.movementDate},${movement.movementType},${movement.quantity},${movement.reason},${movement.fromStore || ''},${movement.toStore || ''},${movement.userName},${movement.notes}`
      ),
      '',
      'Ventas',
      'Número Venta,Fecha,Cantidad,Precio Unitario,Subtotal,Tienda,Cliente',
      ...state.data.sales.map(sale => 
        `${sale.saleNumber},${sale.date},${sale.quantity},${sale.unitPrice},${sale.subtotal},${sale.storeName},${sale.clientName || ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trazabilidad-${state.data.batchInfo.batchCode}-${Date.now()}.csv`;
    link.click();
  };

  const getMovementTypeVariant = (type: string): 'primary' | 'success' | 'warning' => {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'warning';
      case 'TRANSFER': return 'primary';
      default: return 'primary';
    }
  };

  const getMovementTypeText = (type: string): string => {
    switch (type) {
      case 'IN': return 'Entrada';
      case 'OUT': return 'Salida';
      case 'TRANSFER': return 'Transferencia';
      default: return type;
    }
  };

  const getReasonText = (reason: string): string => {
    switch (reason) {
      case 'PRODUCTION': return 'Producción';
      case 'SALE': return 'Venta';
      case 'TRANSFER': return 'Transferencia';
      case 'ADJUSTMENT': return 'Ajuste';
      case 'DAMAGE': return 'Daño';
      case 'EXPIRED': return 'Vencido';
      default: return reason;
    }
  };

  // Filtrar lotes por producto seleccionado
  const filteredBatches = state.selectedProductId
    ? batches.filter(batch => batch.product.id === state.selectedProductId)
    : batches;

  const movementColumns = [
    { 
      key: 'movementDate', 
      header: 'Fecha',
      render: (value: string) => formatters.dateTime(value)
    },
    { 
      key: 'movementType', 
      header: 'Tipo',
      render: (value: string) => (
        <Badge variant={getMovementTypeVariant(value)}>
          {getMovementTypeText(value)}
        </Badge>
      )
    },
    { key: 'quantity', header: 'Cantidad' },
    { 
      key: 'reason', 
      header: 'Razón',
      render: (value: string) => getReasonText(value)
    },
    { key: 'fromStore', header: 'Desde' },
    { key: 'toStore', header: 'Hacia' },
    { key: 'userName', header: 'Usuario' },
    { key: 'notes', header: 'Notas' }
  ];

  const salesColumns = [
    { key: 'saleNumber', header: 'Venta #', render: (value: string) => <span className='text-gray-700'>{value}</span>},
    { 
      key: 'date', 
      header: 'Fecha',
      render: (value: string) => <span className='text-gray-700'>{formatters.dateTime(value)}</span>
    },
    { key: 'quantity', header: 'Cantidad',  render: (value: string) => <span className='text-gray-700'>{value}</span>},
    { 
      key: 'unitPrice', 
      header: 'Precio Unit.',
      render: (value: number) => <span className='text-gray-700'>{formatters.currency(value)}</span>
    },
    { 
      key: 'subtotal', 
      header: 'Subtotal',
      render: (value: number) => <span className='text-gray-700'>{formatters.currency(value)}</span>
    },
    { key: 'storeName', header: 'Tienda',  render: (value: string) => <span className='text-gray-700'>{value}</span>},
    { key: 'clientName', header: 'Cliente', render: (value: string) => <span className='text-gray-700'>{value}</span>}
  ];

  const summaryContent = state.data && state.data.batchInfo ? (
    <div className="space-y-6">
      {/* Información del lote */}
      <Card title="Información del Lote">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div>
            <strong>Código de Lote:</strong> {state.data.batchInfo.batchCode}
          </div>
          <div>
            <strong>Producto:</strong> {state.data.batchInfo.productName}
          </div>
          <div>
            <strong>Fecha Producción:</strong> {formatters.date(state.data.batchInfo.productionDate)}
          </div>
          <div>
            <strong>Fecha Vencimiento:</strong> {formatters.date(state.data.batchInfo.expirationDate)}
          </div>
          <div>
            <strong>Cantidad Inicial:</strong> {formatters.number(state.data.batchInfo.initialQuantity)}
          </div>
          <div>
            <strong>Cantidad Actual:</strong> {formatters.number(state.data.batchInfo.currentQuantity)}
          </div>
        </div>
      </Card>

      {/* Resumen visual */}
      <Card title="Flujo del Lote">
        <div className="space-y-4 text-gray-700">
          <div>
            <div className="flex justify-between mb-2">
              <span>Producido</span>
              <span>{formatters.number(state.data.summary.totalProduced)} unidades</span>
            </div>
            <ProgressBar 
              value={state.data.summary.totalProduced} 
              max={state.data.summary.totalProduced} 
              variant="primary"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span>Vendido</span>
              <span>{formatters.number(state.data.summary.totalSold)} unidades</span>
            </div>
            <ProgressBar 
              value={state.data.summary.totalSold} 
              max={state.data.summary.totalProduced} 
              variant="success"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span>Restante</span>
              <span>{formatters.number(state.data.summary.remaining)} unidades</span>
            </div>
            <ProgressBar 
              value={state.data.summary.remaining} 
              max={state.data.summary.totalProduced} 
              variant="warning"
            />
          </div>
        </div>
      </Card>

      {/* Resumen numérico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl mb-2">📦</div>
          <div className="text-2xl font-bold text-[#7ca1eb]">
            {formatters.number(state.data.summary.totalProduced)}
          </div>
          <div className="text-sm text-gray-600">Producido</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-600">
            {formatters.number(state.data.summary.totalSold)}
          </div>
          <div className="text-sm text-gray-600">Vendido</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl mb-2">🔄</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatters.number(state.data.summary.totalMoved)}
          </div>
          <div className="text-sm text-gray-600">Transferido</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatters.number(state.data.summary.remaining)}
          </div>
          <div className="text-sm text-gray-600">Restante</div>
        </Card>
      </div>
    </div>
  ) : null;

  const tabsData = [
    {
      id: 'summary',
      label: 'Resumen',
      content: summaryContent
    },
    {
      id: 'movements',
      label: 'Movimientos',
      content: (
        <Table
          data={state.data?.movements || []}
          columns={movementColumns}
          emptyMessage="No hay movimientos registrados para este lote"
        />
      )
    },
    {
      id: 'sales',
      label: 'Ventas',
      content: (
        <Table
          data={state.data?.sales || []}
          columns={salesColumns}
          emptyMessage="No hay ventas registradas para este lote"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <Card title="Buscar Lote para Trazabilidad">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filtrar por Producto"
              value={state.selectedProductId?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                handleProductChange(e.target.value)
              }
              options={[
                { value: '', label: 'Todos los productos' },
                ...products.map((product: ProductResponse) => ({
                  value: product.id.toString(),
                  label: product.nameProduct
                }))
              ]}
            />
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Código de Lote
              </label>
              <SearchInput
                placeholder="Buscar por código de lote..."
                onSearch={handleBatchCodeChange}
              />
            </div>
          </div>

          {/* Lista de lotes disponibles */}
          {filteredBatches.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Lotes Disponibles:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {filteredBatches.slice(0, 20).map((batch: ProductBatchResponse) => (
                  <Button
                    key={batch.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchSelect(batch.batchCode)}
                    className="text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">{batch.batchCode}</div>
                      <div className="text-xs text-gray-500">{batch.product.nameProduct}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => generateReport()} 
              isLoading={state.loading}
              disabled={!state.searchBatchCode.trim()}
            >
              Generar Trazabilidad
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
      {state.data && state.data.batchInfo && (
        <Card title={`Trazabilidad del Lote: ${state.data.batchInfo.batchCode}`}>
          <Tabs tabs={tabsData} defaultActiveTab="summary" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Busca un lote específico ingresando su código para realizar la trazabilidad completa.
          </p>
          <p className="text-sm text-gray-400">
            La trazabilidad te permitirá ver todo el historial del lote desde su producción hasta su venta.
          </p>
        </div>
      )}
    </div>
  );
};