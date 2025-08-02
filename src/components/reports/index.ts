// src/components/reports/index.ts

// Export all report components
export { SalesReport } from './SalesReport';
export { InventoryReport } from './InventoryReport';
export { ProfitabilityReport } from './ProfitabilityReport';
export { TopProductsReport } from './TopProductsReport';
export { TraceabilityReport } from './TraceabilityReport';

// Export widget components
export { 
  DailySalesWidget,
  InventoryAlertsWidget,
  TopProductsWidget,
  ProfitabilityWidget,
  ReportsWidgets
} from './ReportsWidgets';

// Export types
export type {
  SalesReportData,
  InventoryReportData,
  ProfitabilityReportData,
  TopProductsReportData,
  TraceabilityReportData,
  ReportFilters,
  ReportProps,
  ReportCardProps
} from '@/types/reports';