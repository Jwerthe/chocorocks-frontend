// src/app/reports/page.tsx
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600 mt-1">Análisis y reportes del sistema (Próximamente)</p>
      </div>

      <Alert variant="info">
        <div className="text-center">
          <h3 className="font-bold mb-2">Módulo en Desarrollo</h3>
          <p>Los reportes y análisis estarán disponibles en una próxima versión del sistema.</p>
        </div>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Reporte de Ventas" className="opacity-50">
          <p className="text-gray-500">Análisis de ventas por período, productos y tiendas.</p>
        </Card>

        <Card title="Reporte de Inventario" className="opacity-50">
          <p className="text-gray-500">Estado actual del inventario y rotación de productos.</p>
        </Card>

        <Card title="Reporte de Rentabilidad" className="opacity-50">
          <p className="text-gray-500">Análisis de costos vs ingresos por producto y tienda.</p>
        </Card>

        <Card title="Reporte de Productos Más Vendidos" className="opacity-50">
          <p className="text-gray-500">Ranking de productos con mayor demanda.</p>
        </Card>

        <Card title="Reporte de Trazabilidad" className="opacity-50">
          <p className="text-gray-500">Seguimiento completo de lotes desde producción hasta venta.</p>
        </Card>

        <Card title="Dashboard Ejecutivo" className="opacity-50">
          <p className="text-gray-500">Indicadores clave de desempeño para la toma de decisiones.</p>
        </Card>
      </div>
    </div>
  );
}