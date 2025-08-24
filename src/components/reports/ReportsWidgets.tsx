// src/components/reports/ReportsWidgets.tsx - CORREGIDO
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatters } from '@/utils/formatters';
import { useReportCalculations } from '@/hooks/useReports';
import { reportsService } from '@/services/reportsService';

// Widget de resumen de ventas del día
interface DailySalesWidgetProps {
  className?: string;
}

export const DailySalesWidget: React.FC<DailySalesWidgetProps> = ({ className = '' }) => {
  const [salesData, setSalesData] = useState<{
    todaySales: number;
    todayRevenue: number;
    yesterdayRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { calculateGrowth, formatCurrency } = useReportCalculations();

  useEffect(() => {
    const loadDailySales = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // ✅ CORREGIDO: Usar nuevos endpoints de reports con manejo de errores
        const [todayData, yesterdayData] = await Promise.all([
          reportsService.generateSalesReport({ startDate: today, endDate: today }),
          reportsService.generateSalesReport({ startDate: yesterday, endDate: yesterday })
        ]);

        setSalesData({
          todaySales: todayData.totalSales || 0,
          todayRevenue: todayData.totalRevenue || 0,
          yesterdayRevenue: yesterdayData.totalRevenue || 0
        });
      } catch (error) {
        console.error('Error loading daily sales:', error);
        setError('Error al cargar ventas del día');
        // ✅ FALLBACK: Datos por defecto si falla la carga
        setSalesData({
          todaySales: 0,
          todayRevenue: 0,
          yesterdayRevenue: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadDailySales();
  }, []);

  if (loading) {
    return (
      <Card className={className} title="Ventas del Día">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} title="Ventas del Día">
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (!salesData) {
    return (
      <Card className={className} title="Ventas del Día">
        <p className="text-gray-500">No hay datos disponibles</p>
      </Card>
    );
  }

  const growth = calculateGrowth(salesData.todayRevenue, salesData.yesterdayRevenue);
  const growthVariant = growth >= 0 ? 'success' : 'danger';

  return (
    <Card className={className} title="Ventas del Día">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Ventas realizadas</span>
          <span className="font-bold text-lg text-gray-700">{formatters.number(salesData.todaySales)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Ingresos</span>
          <span className="font-bold text-lg text-[#7ca1eb]">
            {formatCurrency(salesData.todayRevenue)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">vs. Ayer</span>
          <Badge variant={growthVariant}>
            {growth >= 0 ? '+' : ''}{formatters.percentage(Math.abs(growth))}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

// Widget de alertas de inventario
interface InventoryAlertsWidgetProps {
  className?: string;
  onViewDetails?: () => void;
}

export const InventoryAlertsWidget: React.FC<InventoryAlertsWidgetProps> = ({ 
  className = '', 
  onViewDetails 
}) => {
  const [alertsData, setAlertsData] = useState<{
    lowStock: number;
    expired: number;
    critical: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInventoryAlerts = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        // ✅ CORREGIDO: Usar nuevo endpoint de inventory report con manejo de errores
        const inventoryData = await reportsService.generateInventoryReport();
        
        // ✅ CORREGIDO: Validar estructura de datos del backend
        const stockAlerts = {
          lowStock: inventoryData.lowStockProducts || 0,
          outOfStock: 0, // Esta propiedad no existe en el tipo actual
          critical: 0,   // Esta propiedad no existe en el tipo actual
          expiringSoon: inventoryData.expiredProducts || 0
        };
        
        setAlertsData({
          lowStock: stockAlerts.lowStock || 0,
          expired: stockAlerts.expiringSoon || 0,
          critical: stockAlerts.outOfStock || 0
        });
      } catch (error) {
        console.error('Error loading inventory alerts:', error);
        setError('Error al cargar alertas');
        // ✅ FALLBACK: Datos por defecto si falla la carga
        setAlertsData({
          lowStock: 0,
          expired: 0,
          critical: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadInventoryAlerts();
  }, []);

  if (loading) {
    return (
      <Card className={className} title="Alertas de Inventario">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} title="Alertas de Inventario">
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (!alertsData) {
    return (
      <Card className={className} title="Alertas de Inventario">
        <p className="text-gray-500">No hay datos disponibles</p>
      </Card>
    );
  }

  const hasAlerts = alertsData.lowStock > 0 || alertsData.expired > 0 || alertsData.critical > 0;

  return (
    <Card 
      className={className} 
      title="Alertas de Inventario"
      actions={
        onViewDetails && (
          <Button size="sm" variant="outline" onClick={onViewDetails}>
            Ver Detalles
          </Button>
        )
      }
    >
      {!hasAlerts ? (
        <div className="text-center py-4">
          <div className="text-green-500 text-2xl mb-2">✅</div>
          <p className="text-sm text-gray-600">Todo en orden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertsData.critical > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sin stock</span>
              <Badge variant="danger">
                {formatters.number(alertsData.critical)}
              </Badge>
            </div>
          )}
          
          {alertsData.lowStock > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stock bajo</span>
              <Badge variant="warning">
                {formatters.number(alertsData.lowStock)}
              </Badge>
            </div>
          )}
          
          {alertsData.expired > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Por vencer</span>
              <Badge variant="warning">
                {formatters.number(alertsData.expired)}
              </Badge>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// Widget de productos top
interface TopProductsWidgetProps {
  className?: string;
  limit?: number;
  onViewDetails?: () => void;
}

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ 
  className = '', 
  limit = 5,
  onViewDetails 
}) => {
  const [topProducts, setTopProducts] = useState<Array<{
    productName: string;
    quantitySold: number;
    rank: number;
    revenue: number;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTopProducts = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // ✅ CORREGIDO: Usar nuevo endpoint de best selling products con manejo de errores
        const topProductsData = await reportsService.generateTopProductsReport(
          { startDate, endDate }, 
          limit
        );
        
        setTopProducts((topProductsData.products || []).map(product => ({
          productName: product.productName || 'N/A',
          quantitySold: product.quantitySold || 0,
          rank: product.rank || 0,
          revenue: product.revenue || 0
        })));
      } catch (error) {
        console.error('Error loading top products:', error);
        setError('Error al cargar productos');
        setTopProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopProducts();
  }, [limit]);

  if (loading) {
    return (
      <Card className={className} title={`Top ${limit} Productos`}>
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} title={`Top ${limit} Productos`}>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={className} 
      title={`Top ${limit} Productos (30 días)`}
      actions={
        onViewDetails && (
          <Button size="sm" variant="outline" onClick={onViewDetails}>
            Ver Todos
          </Button>
        )
      }
    >
      {topProducts.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-gray-400 text-2xl mb-2">📦</div>
          <p className="text-gray-500">No hay datos de ventas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topProducts.map((product, index) => {
            const maxQuantity = Math.max(...topProducts.map(p => p.quantitySold));
            const percentage = maxQuantity > 0 ? (product.quantitySold / maxQuantity) * 100 : 0;
            
            return (
              <div key={product.productName + index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={index < 3 ? 'success' : 'primary'} 
                      size="sm"
                    >
                      #{product.rank}
                    </Badge>
                    <span className="text-sm font-medium truncate text-gray-700 max-w-24">
                      {formatters.truncate(product.productName, 20)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-700 font-medium">
                      {formatters.number(product.quantitySold)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatters.currency(product.revenue)}
                    </div>
                  </div>
                </div>
                <ProgressBar 
                  value={percentage} 
                  max={100} 
                  size="sm"
                  variant={index < 3 ? 'success' : 'primary'}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// Widget de rentabilidad rápida
interface ProfitabilityWidgetProps {
  className?: string;
  onViewDetails?: () => void;
}

export const ProfitabilityWidget: React.FC<ProfitabilityWidgetProps> = ({ 
  className = '', 
  onViewDetails 
}) => {
  const [profitData, setProfitData] = useState<{
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    profitMargin: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { getVariantByValue } = useReportCalculations();

  useEffect(() => {
    const loadProfitability = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // ✅ CORREGIDO: Usar nuevo endpoint de profitability report con manejo de errores
        const profitabilityData = await reportsService.generateProfitabilityReport({
          startDate,
          endDate
        });
        
        setProfitData({
          totalRevenue: profitabilityData.totalRevenue || 0,
          totalCosts: profitabilityData.totalCosts || 0,
          grossProfit: profitabilityData.grossProfit || 0,
          profitMargin: profitabilityData.profitMargin || 0
        });
      } catch (error) {
        console.error('Error loading profitability:', error);
        setError('Error al cargar rentabilidad');
        // ✅ FALLBACK: Datos por defecto si falla la carga
        setProfitData({
          totalRevenue: 0,
          totalCosts: 0,
          grossProfit: 0,
          profitMargin: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfitability();
  }, []);

  if (loading) {
    return (
      <Card className={className} title="Rentabilidad (30 días)">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} title="Rentabilidad (30 días)">
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (!profitData) {
    return (
      <Card className={className} title="Rentabilidad (30 días)">
        <p className="text-gray-500">No hay datos disponibles</p>
      </Card>
    );
  }

  const marginVariant = getVariantByValue(profitData.profitMargin, { good: 30, warning: 15 });

  return (
    <Card 
      className={className} 
      title="Rentabilidad (30 días)"
      actions={
        onViewDetails && (
          <Button size="sm" variant="outline" onClick={onViewDetails}>
            Ver Detalles
          </Button>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Ingresos</span>
          <span className="font-medium text-green-600">
            {formatters.currency(profitData.totalRevenue)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Costos</span>
          <span className="font-medium text-red-600">
            {formatters.currency(profitData.totalCosts)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Utilidad</span>
          <span className={`font-bold ${profitData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatters.currency(profitData.grossProfit)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Margen</span>
          <Badge variant={marginVariant}>
            {formatters.percentage(profitData.profitMargin)}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

// Componente que agrupa todos los widgets
interface ReportsWidgetsProps {
  className?: string;
  onNavigateToReports?: (reportType: string) => void;
}

export const ReportsWidgets: React.FC<ReportsWidgetsProps> = ({ 
  className = '', 
  onNavigateToReports 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <DailySalesWidget />
      <InventoryAlertsWidget 
        onViewDetails={() => onNavigateToReports?.('inventory')}
      />
      <TopProductsWidget 
        onViewDetails={() => onNavigateToReports?.('top-products')}
      />
      <ProfitabilityWidget 
        onViewDetails={() => onNavigateToReports?.('profitability')}
      />
    </div>
  );
};