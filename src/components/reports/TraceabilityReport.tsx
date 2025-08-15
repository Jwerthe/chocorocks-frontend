// src/components/reports/TraceabilityReport.tsx - CORREGIDO (Sin Loop Infinito)
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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatters } from '@/utils/formatters';
import { ReportProps } from '@/types/reports';
import { ProductResponse, ProductBatchResponse } from '@/types';
import { productAPI, productBatchAPI } from '@/services/api';
import { reportsService } from '@/services/reportsService';

// ✅ NUEVA: Estructura según el backend real
interface TraceabilityReportResponse {
  batchCode: string;
  productId: number;
  productName: string;
  productionDate: string; // LocalDate se serializa como string
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  movements: BatchMovementResponse[];
  sales: BatchSaleResponse[];
}

interface BatchMovementResponse {
  movementId: number;
  movementType: string;
  fromStore?: string;
  toStore?: string;
  quantity: number;
  reason: string;
  movementDate: string; // LocalDate se serializa como string
  userEmail: string;
}

interface BatchSaleResponse {
  saleId: number;
  saleNumber: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  saleDate: string; // LocalDate se serializa como string
  storeName: string;
  clientName?: string;
}

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

  // ✅ CORREGIDO: useEffect sin dependencias problemáticas
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async (): Promise<void> => {
      try {
        const [productsData, batchesData] = await Promise.all([
          productAPI.getAllProducts(),
          productBatchAPI.getAllBatches()
        ]);
        
        if (isMounted) {
          setProducts(productsData || []);
          setBatches(batchesData || []);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        if (isMounted) {
          setProducts([]);
          setBatches([]);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []); // ✅ CORREGIDO: Array de dependencias vacío

  // ✅ CORREGIDO: useCallback estable sin dependencias problemáticas
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
        searchBatchCode: searchCode
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generando reporte de trazabilidad',
        loading: false 
      }));
    }
  }, [state.searchBatchCode]); // ✅ CORREGIDO: Solo dependencia necesaria

  // ✅ CORREGIDO: Handlers estables
  const handleBatchCodeChange = useCallback((value: string): void => {
    setState(prev => ({ ...prev, searchBatchCode: value }));
  }, []);

  const handleBatchSelect = useCallback((batchCode: string): void => {
    setState(prev => ({ ...prev, searchBatchCode: batchCode }));
    generateReport(batchCode);
  }, [generateReport]);

  const handleProductChange = useCallback((productId: string): void => {
    setState(prev => ({
      ...prev,
      selectedProductId: productId ? parseInt(productId) : null
    }));
  }, []);

  const handleExport = useCallback((): void => {
    if (!state.data) return;

    // ✅ CORREGIDO: Calcular summary en frontend
    const totalSold = state.data.sales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const totalMoved = state.data.movements?.reduce((sum, movement) => {
      if (movement.movementType === 'TRANSFER') {
        return sum + (movement.quantity || 0);
      }
      return sum;
    }, 0) || 0;
    const remaining = (state.data.currentQuantity || 0);

    const csvContent = [
      'Reporte de Trazabilidad',
      `Lote: ${state.data.batchCode || 'N/A'}`,
      `Producto: ${state.data.productName || 'N/A'}`,
      `Fecha Producción: ${state.data.productionDate || 'N/A'}`,
      `Fecha Vencimiento: ${state.data.expirationDate || 'N/A'}`,
      '',
      'Resumen',
      `Cantidad Inicial,${state.data.initialQuantity || 0}`,
      `Cantidad Vendida,${totalSold}`,
      `Cantidad Transferida,${totalMoved}`,
      `Cantidad Restante,${remaining}`,
      '',
      'Movimientos de Inventario',
      'Fecha,Tipo,Cantidad,Razón,Desde,Hacia,Usuario',
      ...(state.data.movements || []).map(movement => 
        `${movement.movementDate || ''},${movement.movementType || ''},${movement.quantity || 0},${movement.reason || ''},${movement.fromStore || ''},${movement.toStore || ''},${movement.userEmail || ''}`
      ),
      '',
      'Ventas',
      'Número Venta,Fecha,Cantidad,Precio Unitario,Subtotal,Tienda,Cliente',
      ...(state.data.sales || []).map(sale => 
        `${sale.saleNumber || ''},${sale.saleDate || ''},${sale.quantity || 0},${sale.unitPrice || 0},${sale.subtotal || 0},${sale.storeName || ''},${sale.clientName || ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trazabilidad-${state.data.batchCode || 'lote'}-${Date.now()}.csv`;
    link.click();
  }, [state.data]);

  // Helper functions
  const getMovementTypeVariant = (type: string | null | undefined): 'primary' | 'success' | 'warning' => {
    if (!type) return 'primary';
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'warning';
      case 'TRANSFER': return 'primary';
      default: return 'primary';
    }
  };

  const getMovementTypeText = (type: string | null | undefined): string => {
    if (!type) return 'N/A';
    switch (type) {
      case 'IN': return 'Entrada';
      case 'OUT': return 'Salida';
      case 'TRANSFER': return 'Transferencia';
      default: return type;
    }
  };

  const getReasonText = (reason: string | null | undefined): string => {
    if (!reason) return 'N/A';
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

  // ✅ CORREGIDO: Filtros estables
  const filteredBatches = React.useMemo(() => {
    return state.selectedProductId
      ? batches.filter(batch => batch.product.id === state.selectedProductId)
      : batches;
  }, [state.selectedProductId, batches]);

  // ✅ CORREGIDO: Columnas con colores mejorados
  const movementColumns = [
    { 
      key: 'movementDate', 
      header: 'Fecha',
      render: (value: string) => <span className="text-gray-700">{formatters.date(value)}</span>
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
    { 
      key: 'quantity', 
      header: 'Cantidad',
      render: (value: number) => <span className="text-gray-700 font-medium">{formatters.number(value || 0)}</span>
    },
    { 
      key: 'reason', 
      header: 'Razón',
      render: (value: string) => <span className="text-gray-700">{getReasonText(value)}</span>
    },
    { 
      key: 'fromStore', 
      header: 'Desde',
      render: (value: string) => <span className="text-gray-700">{value || '-'}</span>
    },
    { 
      key: 'toStore', 
      header: 'Hacia',
      render: (value: string) => <span className="text-gray-700">{value || '-'}</span>
    },
    { 
      key: 'userEmail', 
      header: 'Usuario',
      render: (value: string) => <span className="text-gray-700">{value || 'N/A'}</span>
    }
  ];

  const salesColumns = [
    { 
      key: 'saleNumber', 
      header: 'Venta #', 
      render: (value: string) => <span className='text-gray-700 font-medium'>{value || 'N/A'}</span>
    },
    { 
      key: 'saleDate', 
      header: 'Fecha',
      render: (value: string) => <span className='text-gray-700'>{formatters.date(value)}</span>
    },
    { 
      key: 'quantity', 
      header: 'Cantidad',  
      render: (value: number) => <span className='text-gray-700'>{formatters.number(value || 0)}</span>
    },
    { 
      key: 'unitPrice', 
      header: 'Precio Unit.',
      render: (value: number) => <span className='text-gray-700'>{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'subtotal', 
      header: 'Subtotal',
      render: (value: number) => <span className='text-gray-700 font-medium'>{formatters.currency(value || 0)}</span>
    },
    { 
      key: 'storeName', 
      header: 'Tienda',  
      render: (value: string) => <span className='text-gray-700'>{value || 'N/A'}</span>
    },
    { 
      key: 'clientName', 
      header: 'Cliente', 
      render: (value: string) => <span className='text-gray-700'>{value || 'Sin cliente'}</span>
    }
  ];

  // ✅ CORREGIDO: Calcular summary en el frontend según la estructura real del backend
  const calculatedSummary = React.useMemo(() => {
    if (!state.data) return null;

    const totalProduced = state.data.initialQuantity || 0;
    const totalSold = state.data.sales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const totalMoved = state.data.movements?.filter(m => m.movementType === 'TRANSFER')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0) || 0;
    const remaining = state.data.currentQuantity || 0;

    return {
      totalProduced,
      totalSold,
      totalMoved,
      remaining
    };
  }, [state.data]);

  // ✅ CORREGIDO: Contenido del resumen según estructura real
  const summaryContent = state.data ? (
    <div className="space-y-6">
      {/* Información del lote */}
      <Card title="Información del Lote">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-gray-700">
            <strong>Código de Lote:</strong> {state.data.batchCode || 'N/A'}
          </div>
          <div className="text-gray-700">
            <strong>Producto:</strong> {state.data.productName || 'N/A'}
          </div>
          <div className="text-gray-700">
            <strong>Fecha Producción:</strong> {formatters.date(state.data.productionDate)}
          </div>
          <div className="text-gray-700">
            <strong>Fecha Vencimiento:</strong> {formatters.date(state.data.expirationDate)}
          </div>
          <div className="text-gray-700">
            <strong>Cantidad Inicial:</strong> {formatters.number(state.data.initialQuantity || 0)}
          </div>
          <div className="text-gray-700">
            <strong>Cantidad Actual:</strong> {formatters.number(state.data.currentQuantity || 0)}
          </div>
        </div>
      </Card>

      {/* Resumen visual calculado */}
      {calculatedSummary && (
        <Card title="Flujo del Lote">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2 text-gray-700">
                <span>Producido</span>
                <span>{formatters.number(calculatedSummary.totalProduced)} unidades</span>
              </div>
              <ProgressBar 
                value={calculatedSummary.totalProduced} 
                max={calculatedSummary.totalProduced || 1} 
                variant="primary"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2 text-gray-700">
                <span>Vendido</span>
                <span>{formatters.number(calculatedSummary.totalSold)} unidades</span>
              </div>
              <ProgressBar 
                value={calculatedSummary.totalSold} 
                max={calculatedSummary.totalProduced || 1} 
                variant="success"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2 text-gray-700">
                <span>Transferido</span>
                <span>{formatters.number(calculatedSummary.totalMoved)} unidades</span>
              </div>
              <ProgressBar 
                value={calculatedSummary.totalMoved} 
                max={calculatedSummary.totalProduced || 1} 
                variant="warning"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2 text-gray-700">
                <span>Restante</span>
                <span>{formatters.number(calculatedSummary.remaining)} unidades</span>
              </div>
              <ProgressBar 
                value={calculatedSummary.remaining} 
                max={calculatedSummary.totalProduced || 1} 
                variant="primary"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Resumen numérico */}
      {calculatedSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-2xl font-bold text-[#7ca1eb]">
              {formatters.number(calculatedSummary.totalProduced)}
            </div>
            <div className="text-sm text-gray-600">Producido</div>
          </Card>
          
          <Card className="text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-green-600">
              {formatters.number(calculatedSummary.totalSold)}
            </div>
            <div className="text-sm text-gray-600">Vendido</div>
          </Card>
          
          <Card className="text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatters.number(calculatedSummary.totalMoved)}
            </div>
            <div className="text-sm text-gray-600">Transferido</div>
          </Card>
          
          <Card className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatters.number(calculatedSummary.remaining)}
            </div>
            <div className="text-sm text-gray-600">Restante</div>
          </Card>
        </div>
      )}
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-gray-500">No se encontraron datos para este lote.</p>
    </div>
  );

  const tabsData = [
    {
      id: 'summary',
      label: 'Resumen',
      content: summaryContent
    },
    {
      id: 'movements',
      label: `Movimientos (${(state.data?.movements || []).length})`,
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
      label: `Ventas (${(state.data?.sales || []).length})`,
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
      {state.data && (
        <Card title={`Trazabilidad del Lote: ${state.data.batchCode || 'N/A'}`}>
          <Tabs tabs={tabsData} defaultActiveTab="summary" />
        </Card>
      )}

      {/* Mensaje inicial */}
      {!state.data && !state.loading && !state.error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Trazabilidad de Lotes</h3>
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