// src/services/reportsService.ts
import { 
  SaleResponse, 
  SaleDetailResponse, 
  ProductResponse, 
  StoreResponse, 
  ProductStoreResponse,
  ProductBatchResponse,
  InventoryMovementResponse,
  CategoryResponse
} from '@/types';
import { 
  SalesReportData, 
  InventoryReportData, 
  ProfitabilityReportData, 
  TopProductsReportData,
  TraceabilityReportData,
  ReportFilters 
} from '@/types/reports';
import { 
  saleAPI, 
  saleDetailAPI, 
  productAPI, 
  storeAPI, 
  productStoreAPI,
  productBatchAPI,
  inventoryMovementAPI,
  categoryAPI
} from '@/services/api';

class ReportsService {
  // Obtener todos los datos necesarios para reportes
  async getAllReportData(): Promise<{
    sales: SaleResponse[];
    saleDetails: SaleDetailResponse[];
    products: ProductResponse[];
    stores: StoreResponse[];
    productStores: ProductStoreResponse[];
    productBatches: ProductBatchResponse[];
    inventoryMovements: InventoryMovementResponse[];
    categories: CategoryResponse[];
  }> {
    const [
      sales,
      saleDetails,
      products,
      stores,
      productStores,
      productBatches,
      inventoryMovements,
      categories
    ] = await Promise.all([
      saleAPI.getAllSales(),
      saleDetailAPI.getAllSaleDetails(),
      productAPI.getAllProducts(),
      storeAPI.getAllStores(),
      productStoreAPI.getAllProductStores(),
      productBatchAPI.getAllBatches(),
      inventoryMovementAPI.getAllMovements(),
      categoryAPI.getAllCategories()
    ]);

    return {
      sales,
      saleDetails,
      products,
      stores,
      productStores,
      productBatches,
      inventoryMovements,
      categories
    };
  }

  // Filtrar ventas por criterios
  filterSales(sales: SaleResponse[], filters: ReportFilters): SaleResponse[] {
    return sales.filter((sale: SaleResponse) => {
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      
      return (!filters.startDate || saleDate >= filters.startDate) && 
             (!filters.endDate || saleDate <= filters.endDate) &&
             (!filters.storeId || sale.store.id === filters.storeId);
    });
  }

  // Filtrar detalles de venta por criterios
  filterSaleDetails(
    saleDetails: SaleDetailResponse[], 
    filteredSaleIds: Set<number>, 
    filters: ReportFilters
  ): SaleDetailResponse[] {
    return saleDetails.filter((detail: SaleDetailResponse) => 
      filteredSaleIds.has(detail.sale.id) &&
      (!filters.productId || detail.product.id === filters.productId) &&
      (!filters.categoryId || detail.product.category.id === filters.categoryId)
    );
  }

  // Generar reporte de ventas
  async generateSalesReport(filters: ReportFilters): Promise<SalesReportData> {
    const { sales, saleDetails, stores } = await this.getAllReportData();
    
    const filteredSales = this.filterSales(sales, filters);
    const filteredSaleIds = new Set(filteredSales.map(sale => sale.id));
    const filteredSaleDetails = this.filterSaleDetails(saleDetails, filteredSaleIds, filters);

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Ventas por tienda
    const salesByStore = stores.map(store => {
      const storeSales = filteredSales.filter(sale => sale.store.id === store.id);
      return {
        storeName: store.name,
        salesCount: storeSales.length,
        revenue: storeSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      };
    }).filter(item => item.salesCount > 0);

    // Ventas por producto
    const productSalesMap = new Map<number, { name: string; quantity: number; revenue: number }>();
    
    filteredSaleDetails.forEach(detail => {
      const productId = detail.product.id;
      const existing = productSalesMap.get(productId) || { 
        name: detail.product.nameProduct, 
        quantity: 0, 
        revenue: 0 
      };
      existing.quantity += detail.quantity;
      existing.revenue += detail.subtotal;
      productSalesMap.set(productId, existing);
    });

    const salesByProduct = Array.from(productSalesMap.values())
      .map(item => ({
        productName: item.name,
        quantitySold: item.quantity,
        revenue: item.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Ventas diarias
    const dailySalesMap = new Map<string, { sales: number; revenue: number }>();
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      const existing = dailySalesMap.get(date) || { sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sale.totalAmount;
      dailySalesMap.set(date, existing);
    });

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: `${filters.startDate} - ${filters.endDate}`,
      totalSales,
      totalRevenue,
      averageTicket,
      salesByStore,
      salesByProduct,
      dailySales
    };
  }

  // Generar reporte de inventario
  async generateInventoryReport(storeId?: number): Promise<InventoryReportData> {
    const { products, stores, productStores, productBatches } = await this.getAllReportData();

    const filteredProductStores = storeId 
      ? productStores.filter(ps => ps.store.id === storeId)
      : productStores;

    const filteredBatches = storeId
      ? productBatches.filter(batch => batch.store && batch.store.id === storeId)
      : productBatches;

    const totalProducts = filteredProductStores.length;
    const lowStockProducts = filteredProductStores.filter(ps => 
      ps.currentStock <= ps.minStockLevel).length;
    
    const today = new Date();
    const expiredBatches = filteredBatches.filter(batch => 
      new Date(batch.expirationDate) < today);
    const expiredProducts = expiredBatches.length;

    const totalStockValue = filteredProductStores.reduce((sum, ps) => {
      const product = products.find(p => p.id === ps.product.id);
      return sum + (ps.currentStock * (product?.productionCost || 0));
    }, 0);

    // Inventario por tienda
    const inventoryByStore = stores.map(store => {
      const storeProductStores = productStores.filter(ps => ps.store.id === store.id);
      
      const productsCount = storeProductStores.length;
      const totalStock = storeProductStores.reduce((sum, ps) => sum + ps.currentStock, 0);
      const stockValue = storeProductStores.reduce((sum, ps) => {
        const product = products.find(p => p.id === ps.product.id);
        return sum + (ps.currentStock * (product?.productionCost || 0));
      }, 0);

      return {
        storeName: store.name,
        productsCount,
        totalStock,
        stockValue
      };
    }).filter(item => item.productsCount > 0);

    // Rotación de productos
    const productRotation = filteredProductStores.map(ps => {
      const product = products.find(p => p.id === ps.product.id);
      
      let status: 'normal' | 'low' | 'critical';
      if (ps.currentStock === 0) {
        status = 'critical';
      } else if (ps.currentStock <= ps.minStockLevel) {
        status = 'low';
      } else {
        status = 'normal';
      }

      const averageDailySales = 5;
      const daysOfStock = ps.currentStock / Math.max(averageDailySales, 1);

      return {
        productName: product?.nameProduct || 'Producto desconocido',
        currentStock: ps.currentStock,
        minStockLevel: ps.minStockLevel,
        status,
        daysOfStock: Math.round(daysOfStock)
      };
    });

    // Lotes vencidos
    const expiredBatchesData = expiredBatches.map(batch => ({
      batchCode: batch.batchCode,
      productName: batch.product.nameProduct,
      expirationDate: batch.expirationDate,
      quantity: batch.currentQuantity
    }));

    return {
      totalProducts,
      lowStockProducts,
      expiredProducts,
      totalStockValue,
      inventoryByStore,
      productRotation: productRotation.sort((a, b) => {
        if (a.status === 'critical' && b.status !== 'critical') return -1;
        if (a.status !== 'critical' && b.status === 'critical') return 1;
        if (a.status === 'low' && b.status === 'normal') return -1;
        if (a.status === 'normal' && b.status === 'low') return 1;
        return 0;
      }),
      expiredBatches: expiredBatchesData
    };
  }

  // Generar reporte de rentabilidad
  async generateProfitabilityReport(filters: ReportFilters): Promise<ProfitabilityReportData> {
    const { sales, saleDetails, products } = await this.getAllReportData();
    
    const filteredSales = this.filterSales(sales, filters);
    const filteredSaleIds = new Set(filteredSales.map(sale => sale.id));
    const filteredSaleDetails = this.filterSaleDetails(saleDetails, filteredSaleIds, filters);

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    let totalCosts = 0;
    const productProfitability = new Map();
    const storeProfitability = new Map();

    filteredSaleDetails.forEach(detail => {
      const product = products.find(p => p.id === detail.product.id);
      if (!product) return;

      const detailRevenue = detail.subtotal;
      const detailCost = detail.quantity * product.productionCost;
      totalCosts += detailCost;

      // Por producto
      const productId = detail.product.id;
      const existingProduct = productProfitability.get(productId) || {
        productName: product.nameProduct,
        category: product.category.name,
        revenue: 0,
        costs: 0,
        unitsSold: 0
      };
      existingProduct.revenue += detailRevenue;
      existingProduct.costs += detailCost;
      existingProduct.unitsSold += detail.quantity;
      productProfitability.set(productId, existingProduct);

      // Por tienda
      const sale = filteredSales.find(s => s.id === detail.sale.id);
      if (sale) {
        const storeId = sale.store.id;
        const existingStore = storeProfitability.get(storeId) || {
          storeName: sale.store.name,
          revenue: 0,
          costs: 0
        };
        existingStore.revenue += detailRevenue;
        existingStore.costs += detailCost;
        storeProfitability.set(storeId, existingStore);
      }
    });

    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const profitabilityByProduct = Array.from(productProfitability.values())
      .map(item => ({
        ...item,
        profit: item.revenue - item.costs,
        margin: item.revenue > 0 ? ((item.revenue - item.costs) / item.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);

    const profitabilityByStore = Array.from(storeProfitability.values())
      .map(item => ({
        ...item,
        profit: item.revenue - item.costs,
        margin: item.revenue > 0 ? ((item.revenue - item.costs) / item.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      profitMargin,
      profitabilityByProduct,
      profitabilityByStore
    };
  }

  // Generar reporte de productos más vendidos
  async generateTopProductsReport(filters: ReportFilters, topCount: number = 20): Promise<TopProductsReportData> {
    const { sales, saleDetails, categories } = await this.getAllReportData();
    
    const filteredSales = this.filterSales(sales, filters);
    const filteredSaleIds = new Set(filteredSales.map(sale => sale.id));
    const filteredSaleDetails = this.filterSaleDetails(saleDetails, filteredSaleIds, filters);

    // Agrupar por producto
    const productSalesMap = new Map();

    filteredSaleDetails.forEach(detail => {
      const productId = detail.product.id;
      const existing = productSalesMap.get(productId) || {
        product: detail.product,
        totalQuantitySold: 0,
        totalRevenue: 0,
        salesCount: 0
      };

      existing.totalQuantitySold += detail.quantity;
      existing.totalRevenue += detail.subtotal;
      existing.salesCount += 1;

      productSalesMap.set(productId, existing);
    });

    const productSales = Array.from(productSalesMap.values())
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
      .slice(0, topCount);

    const topProducts = productSales.map((item, index) => ({
      productName: item.product.nameProduct,
      category: item.product.category.name,
      totalQuantitySold: item.totalQuantitySold,
      totalRevenue: item.totalRevenue,
      salesCount: item.salesCount,
      averagePrice: item.totalRevenue / Math.max(item.totalQuantitySold, 1),
      rank: index + 1
    }));

    // Rendimiento por categoría
    const categoryMap = new Map();

    productSales.forEach(item => {
      const categoryId = item.product.category.id;
      const existing = categoryMap.get(categoryId) || {
        categoryName: item.product.category.name,
        totalQuantitySold: 0,
        totalRevenue: 0,
        productsCount: 0
      };

      existing.totalQuantitySold += item.totalQuantitySold;
      existing.totalRevenue += item.totalRevenue;
      existing.productsCount += 1;

      categoryMap.set(categoryId, existing);
    });

    const categoryPerformance = Array.from(categoryMap.values())
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

    return {
      reportPeriod: `${filters.startDate} - ${filters.endDate}`,
      topProducts,
      categoryPerformance
    };
  }

  // Generar reporte de trazabilidad
  async generateTraceabilityReport(batchCode: string): Promise<TraceabilityReportData> {
    const { productBatches, inventoryMovements, saleDetails } = await this.getAllReportData();

    const targetBatch = productBatches.find(batch => 
      batch.batchCode.toLowerCase().includes(batchCode.toLowerCase())
    );

    if (!targetBatch) {
      throw new Error(`No se encontró ningún lote con el código "${batchCode}"`);
    }

    // Movimientos relacionados
    const relatedMovements = inventoryMovements
      .filter(movement => movement.batch && movement.batch.id === targetBatch.id)
      .map(movement => ({
        id: movement.id,
        movementType: movement.movementType,
        quantity: movement.quantity,
        reason: movement.reason,
        movementDate: movement.movementDate,
        fromStore: movement.fromStore?.name,
        toStore: movement.toStore?.name,
        userName: movement.user.name,
        notes: movement.notes || ''
      }))
      .sort((a, b) => new Date(a.movementDate).getTime() - new Date(b.movementDate).getTime());

    // Ventas relacionadas
    const relatedSales = saleDetails
      .filter(detail => detail.batch && detail.batch.id === targetBatch.id)
      .map(detail => ({
        saleNumber: detail.sale.saleNumber,
        date: detail.sale.createdAt,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        subtotal: detail.subtotal,
        storeName: detail.sale.store.name,
        clientName: detail.sale.client?.nameLastname
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Resumen
    const totalProduced = targetBatch.initialQuantity;
    const totalSold = relatedSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalMoved = relatedMovements
      .filter(movement => movement.movementType === 'TRANSFER')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const remaining = targetBatch.currentQuantity;

    return {
      batchInfo: {
        batchCode: targetBatch.batchCode,
        productName: targetBatch.product.nameProduct,
        productionDate: targetBatch.productionDate,
        expirationDate: targetBatch.expirationDate,
        initialQuantity: targetBatch.initialQuantity,
        currentQuantity: targetBatch.currentQuantity
      },
      movements: relatedMovements,
      sales: relatedSales,
      summary: {
        totalProduced,
        totalSold,
        totalMoved,
        remaining
      }
    };
  }
}

export const reportsService = new ReportsService();