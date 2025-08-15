// src/components/sales/SaleDetailModal.tsx (ACTUALIZADO)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { 
  SaleResponse, 
  SaleDetailResponse,
  SaleType 
} from '@/types';
import { ReceiptResponse } from '@/types/receipts';
import { saleDetailAPI, ApiError } from '@/services/api';
import { receiptService } from '@/services/receiptService';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleResponse;
}

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const [saleDetails, setSaleDetails] = useState<SaleDetailResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // ✅ Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [existingReceipt, setExistingReceipt] = useState<ReceiptResponse | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);
  const [receiptCheckComplete, setReceiptCheckComplete] = useState<boolean>(false);

  // ✅ ACTUALIZADO: Reset states cuando cambia la venta o se abre el modal
  useEffect(() => {
    if (isOpen && sale) {
      console.log('🔄 Modal abierto para venta:', sale.saleNumber);
      
      // Reset estados
      setExistingReceipt(null);
      setReceiptCheckComplete(false);
      setError('');
      
      // Cargar datos
      fetchSaleDetails();
      checkExistingReceipt();
    } else if (!isOpen) {
      // Limpiar estados cuando se cierra el modal
      console.log('🔒 Modal cerrado, limpiando estados');
      setExistingReceipt(null);
      setReceiptCheckComplete(false);
      setSaleDetails([]);
      setError('');
    }
  }, [isOpen, sale]);

  const fetchSaleDetails = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      console.log('📋 Cargando detalles de venta ID:', sale.id);
      
      const allDetails = await saleDetailAPI.getAllSaleDetails();
      const filteredDetails = allDetails.filter(detail => detail.sale.id === sale.id);
      
      console.log(`✅ ${filteredDetails.length} detalles encontrados para venta ${sale.saleNumber}`);
      setSaleDetails(filteredDetails);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Error al cargar los detalles de la venta';
      setError(errorMessage);
      console.error('❌ Error cargando detalles:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZADO: Verificar recibo existente
  const checkExistingReceipt = useCallback(async (): Promise<void> => {
    setLoadingReceipt(true);
    setReceiptCheckComplete(false);
    
    try {
      console.log('🧾 Verificando recibo para venta ID:', sale.id);
      
      // Usar el servicio directamente
      const receipt = await receiptService.findBySaleId(sale.id);
      
      if (receipt) {
        console.log('✅ Recibo encontrado:', receipt.receiptNumber);
        setExistingReceipt(receipt);
      } else {
        console.log('⚠️ No se encontró recibo para esta venta');
        setExistingReceipt(null);
      }
    } catch (err) {
      console.error('❌ Error verificando recibo:', err);
      setExistingReceipt(null);
      
      // Solo mostrar error si no es un 404
      if (err instanceof Error && !err.message.includes('404')) {
        setError(`Error al verificar recibo: ${err.message}`);
      }
    } finally {
      setLoadingReceipt(false);
      setReceiptCheckComplete(true);
    }
  }, [sale.id]);

  // ✅ ACTUALIZADO: Handle receipt modal success
  const handleReceiptSuccess = useCallback((receipt: ReceiptResponse): void => {
    console.log('✅ Recibo creado/actualizado exitosamente:', receipt.receiptNumber);
    setExistingReceipt(receipt);
    setShowReceiptModal(false);
    
    // Opcional: Recargar para asegurar sincronización
    setTimeout(() => {
      checkExistingReceipt();
    }, 500);
  }, [checkExistingReceipt]);

  // ✅ Handle print/receipt generation
  const handlePrintReceipt = (): void => {
    console.log('📄 Abriendo modal de recibo, recibo existente:', existingReceipt?.receiptNumber);
    setShowReceiptModal(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const detailColumns: TableColumn<SaleDetailResponse>[] = [
    {
      key: 'product.nameProduct',
      header: 'Producto',
      render: (value: string, row: SaleDetailResponse) => (
        <div>
          <div className="font-medium text-gray-800">{value}</div>
          <div className="text-sm text-gray-600">
            {row.product.flavor && `${row.product.flavor} - `}
            {row.product.size || 'Sin tamaño'}
          </div>
          {row.product.code && (
            <div className="text-xs text-gray-500 font-mono">
              Código: {row.product.code}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (value: number) => (
        <span className="font-bold text-center text-gray-700 block">{value}</span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Precio Unitario',
      render: (value: number) => (
        <span className="font-medium text-gray-700">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (value: number) => (
        <span className="font-bold text-green-600">
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (value: any) => (
        <span className="text-sm text-gray-700">
          {value ? (
            <Badge variant="secondary" size="sm">
              {value.batchCode}
            </Badge>
          ) : (
            <span className="text-gray-500">Sin lote</span>
          )}
        </span>
      ),
    },
  ];

  // Calculate totals for verification
  const calculatedSubtotal = saleDetails.reduce((sum, detail) => sum + Number(detail.subtotal), 0);
  const totalQuantity = saleDetails.reduce((sum, detail) => sum + detail.quantity, 0);

  // ✅ Determinar el estado del recibo
  const getReceiptStatus = (): React.ReactNode => {
    if (loadingReceipt) {
      return (
        <div className="inline-flex items-center space-x-1">
          <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent" />
          <span className="text-xs text-gray-500">Verificando...</span>
        </div>
      );
    }
    
    if (!receiptCheckComplete) {
      return (
        <Badge variant="secondary" size="sm">
          Esperando...
        </Badge>
      );
    }
    
    if (existingReceipt) {
      return (
        <div className="flex items-center space-x-2">
          <Badge variant="success" size="sm">
            {existingReceipt.receiptNumber}
          </Badge>
          {existingReceipt.isPrinted && (
            <Badge variant="secondary" size="sm">
              Impreso ({existingReceipt.printCount}x)
            </Badge>
          )}
        </div>
      );
    }
    
    return (
      <Badge variant="warning" size="sm">
        Sin recibo
      </Badge>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles de Venta - ${sale.saleNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Sale Header Information */}
        <Card title="Información de la Venta">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Número de Venta:</label>
                <p className="font-bold text-gray-700 text-lg">{sale.saleNumber}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Fecha:</label>
                <p className='text-gray-600'>{formatDate(sale.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Vendedor:</label>
                <p className="font-medium text-gray-600">{sale.user.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Cliente:</label>
                <p className='text-gray-700'>{sale.client?.nameLastname || 'Cliente General'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mr-4">Tienda:</label>
                <Badge variant="secondary">{sale.store.name}</Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 mr-4">Tipo de Venta:</label>
                <Badge 
                  variant={sale.saleType === SaleType.RETAIL ? 'primary' : 'secondary'}
                >
                  {sale.saleType === SaleType.RETAIL ? 'Al Detalle' : 'Al Por Mayor'}
                </Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 mr-4">Estado de Facturación:</label>
                <Badge variant={sale.isInvoiced ? 'success' : 'warning'}>
                  {sale.isInvoiced ? 'Facturada' : 'Sin Facturar'}
                </Badge>
              </div>
              
              {sale.paymentMethod && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Método de Pago:</label>
                  <p className='text-gray-700'>{sale.paymentMethod}</p>
                </div>
              )}

              {/* ✅ Receipt Status Display */}
              <div>
                <label className="text-sm font-medium text-gray-600 mr-4">Estado del Recibo:</label>
                {getReceiptStatus()}
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <label className="text-sm font-medium text-gray-600">Notas:</label>
              <p className="mt-1 text-gray-700">{sale.notes}</p>
            </div>
          )}
        </Card>

        {/* Sale Details Table */}
        <Card title={`Productos de la Venta (${saleDetails.length} items)`}>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
            </div>
          ) : saleDetails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No se encontraron detalles para esta venta</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table
                data={saleDetails}
                columns={detailColumns}
                emptyMessage="No hay productos en esta venta"
              />
              
              {/* Summary totals */}
              <div className="bg-gray-50 border-2 border-black p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Productos:</p>
                    <p className="font-bold text-gray-700 text-lg">{saleDetails.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cantidad Total:</p>
                    <p className="font-bold text-gray-700 text-lg">{totalQuantity}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Sale Totals */}
        <Card title="Resumen Financiero">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-700">{formatCurrency(Number(sale.subtotal))}</span>
              </div>
              
              {Number(sale.discountAmount) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Descuento ({Number(sale.discountPercentage)}%):
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(Number(sale.discountAmount))}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Impuestos ({Number(sale.taxPercentage)}%):
                </span>
                <span className="font-medium text-gray-700">{formatCurrency(Number(sale.taxAmount))}</span>
              </div>
              
              <div className="flex justify-between items-center border-t-2 border-black pt-3">
                <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(Number(sale.totalAmount))}
                </span>
              </div>
            </div>

            {/* Verification column */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h5 className="font-medium text-blue-800 mb-2">Verificación:</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal calculado:</span>
                  <span className={calculatedSubtotal === Number(sale.subtotal) ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(calculatedSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Diferencia:</span>
                  <span className={Math.abs(calculatedSubtotal - Number(sale.subtotal)) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(Math.abs(calculatedSubtotal - Number(sale.subtotal)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ✅ Receipt Information Card */}
        {existingReceipt && receiptCheckComplete && (
          <Card title="Información del Recibo">
            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Número:</span>
                  <span className="ml-2 text-gray-700">{existingReceipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Fecha de Emisión:</span>
                  <span className="ml-2 text-gray-700">{formatDate(existingReceipt.issueDate)}</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Estado:</span>
                  <span className="ml-2">
                    <Badge variant="success" size="sm">
                      {existingReceipt.receiptStatus}
                    </Badge>
                  </span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Impreso:</span>
                  <span className="ml-2 text-gray-700">
                    {existingReceipt.isPrinted ? 
                      `Sí (${existingReceipt.printCount} veces)` : 
                      'No'
                    }
                  </span>
                </div>
                {existingReceipt.paymentMethod && (
                  <div>
                    <span className="text-green-700 font-medium">Método de Pago:</span>
                    <span className="ml-2 text-gray-700">{existingReceipt.paymentMethod}</span>
                  </div>
                )}
                {existingReceipt.additionalNotes && (
                  <div className="md:col-span-2">
                    <span className="text-green-700 font-medium">Notas del Recibo:</span>
                    <p className="mt-1 text-gray-700">{existingReceipt.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
          {/* Receipt Status Indicator */}
          <div className="flex items-center space-x-2">
            {loadingReceipt ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                <span className="text-sm text-gray-600">Verificando recibo...</span>
              </div>
            ) : receiptCheckComplete && existingReceipt ? (
              <div className="flex items-center space-x-2">
                <Badge variant="success" size="sm">
                  Recibo: {existingReceipt.receiptNumber}
                </Badge>
                {existingReceipt.isPrinted && (
                  <Badge variant="secondary" size="sm">
                    Impreso ({existingReceipt.printCount}x)
                  </Badge>
                )}
              </div>
            ) : receiptCheckComplete ? (
              <Badge variant="warning" size="sm">
                Sin recibo generado
              </Badge>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handlePrintReceipt}
              disabled={loadingReceipt || !receiptCheckComplete}
              className="px-4 py-2 bg-blue-600 text-white border-2 border-black font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={existingReceipt ? 'Gestionar recibo existente' : 'Generar nuevo recibo'}
            >
              {existingReceipt ? 'Gestionar Recibo' : 'Generar Recibo'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#7ca1eb] text-white border-2 border-black font-medium hover:bg-[#6b90da] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          onSuccess={handleReceiptSuccess}
          sale={sale}
          existingReceipt={existingReceipt}
        />
      )}
    </Modal>
  );
};