// src/components/receipts/ReceiptModal.tsx (VERSIÓN SIMPLIFICADA)
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { SaleResponse } from '@/types';
import { CompleteWithReceiptRequest, ReceiptResponse } from '@/types/receipts';
import { useReceipts } from '@/hooks/useReceipts';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receipt: ReceiptResponse) => void;
  sale: SaleResponse;
  existingReceipt?: ReceiptResponse | null;
}

interface SelectOption {
  value: string;
  label: string;
}

interface FormErrors {
  [key: string]: string;
}

// ✅ NUEVA: Interfaz simplificada solo con los campos que acepta el backend
interface ReceiptFormData {
  paymentMethod: string;
  additionalNotes: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sale,
  existingReceipt,
}) => {
  const {
    completeWithReceipt,
    printReceipt,
    sendReceiptByEmail,
    downloadXml,
    downloadPdf,
    processing,
    error,
    clearError,
  } = useReceipts();

  // ✅ SIMPLIFICADO: Solo los campos que acepta el backend
  const [formData, setFormData] = useState<ReceiptFormData>({
    paymentMethod: sale.paymentMethod || 'Efectivo',
    additionalNotes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptResponse | null>(null);
  const [action, setAction] = useState<'print' | 'email' | 'download' | null>(null);

  // ✅ NUEVO: Para el envío por email (solo para recibos existentes)
  const [emailData, setEmailData] = useState({
    recipientEmail: sale.client?.email || '',
    sendEmail: false
  });

  useEffect(() => {
    if (isOpen) {
      if (existingReceipt) {
        setCurrentReceipt(existingReceipt);
      } else {
        setCurrentReceipt(null);
        setFormData({
          paymentMethod: sale.paymentMethod || 'Efectivo',
          additionalNotes: '',
        });
        setEmailData({
          recipientEmail: sale.client?.email || '',
          sendEmail: false
        });
      }
      clearError();
      setErrors({});
      setAction(null);
    }
  }, [isOpen, existingReceipt, sale, clearError]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.paymentMethod?.trim()) {
      newErrors.paymentMethod = 'El método de pago es requerido';
    }

    if (formData.additionalNotes && formData.additionalNotes.length > 500) {
      newErrors.additionalNotes = 'Las notas no pueden exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ReceiptFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGenerateReceipt = async (): Promise<void> => {
    if (!validateForm()) return;

    try {
      console.log('🧾 Generating receipt for sale:', sale.id);
      console.log('📋 Form data:', formData);
      
      // ✅ Crear objeto compatible con la interfaz esperada
      const receiptData: CompleteWithReceiptRequest = {
        paymentMethod: formData.paymentMethod,
        additionalNotes: formData.additionalNotes || undefined,
        // No incluir campos que el backend no acepta
      };
      
      const receipt = await completeWithReceipt(sale.id, receiptData);
      setCurrentReceipt(receipt);
      
      // Execute the selected action
      if (action === 'print') {
        await handlePrint(receipt.id);
      }
      
      onSuccess?.(receipt);
    } catch (err: any) {
      console.error('❌ Error generating receipt:', err);
    }
  };

  const handlePrint = async (receiptId: number): Promise<void> => {
    try {
      await printReceipt(receiptId);
    } catch (err) {
      console.error('Error printing receipt:', err);
    }
  };

  const handleSendEmail = async (receiptId: number, email: string): Promise<void> => {
    try {
      await sendReceiptByEmail(receiptId, email, formData.additionalNotes);
    } catch (err) {
      console.error('Error sending email:', err);
    }
  };

  const handleDownloadXml = async (receiptId: number): Promise<void> => {
    try {
      await downloadXml(receiptId);
    } catch (err) {
      console.error('Error downloading XML:', err);
    }
  };

  const handleDownloadPdf = async (receiptId: number): Promise<void> => {
    try {
      await downloadPdf(receiptId);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
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

  const paymentMethodOptions: SelectOption[] = [
    { value: '', label: 'Seleccionar método de pago...' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
    { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
    { value: 'Transferencia', label: 'Transferencia Bancaria' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Mixto', label: 'Pago Mixto' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentReceipt ? `Recibo - ${currentReceipt.receiptNumber}` : 'Generar Recibo'}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="error" onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Sale Information */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Información de la Venta</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Número de Venta:</span>
              <span className="ml-2 font-medium">{sale.saleNumber}</span>
            </div>
            <div>
              <span className="text-gray-600">Total:</span>
              <span className="ml-2 font-bold text-green-600">
                {formatCurrency(Number(sale.totalAmount))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Tienda:</span>
              <span className="ml-2">{sale.store.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Cliente:</span>
              <span className="ml-2">{sale.client?.nameLastname || 'Cliente General'}</span>
            </div>
          </div>
        </div>

        {currentReceipt ? (
          /* Existing Receipt Actions */
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-green-800">
                  Recibo Generado
                </h3>
                <Badge variant="success">
                  {currentReceipt.receiptStatus}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-green-700">Número:</span>
                  <span className="ml-2 font-medium">{currentReceipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-green-700">Fecha:</span>
                  <span className="ml-2">{formatDate(currentReceipt.issueDate)}</span>
                </div>
                <div>
                  <span className="text-green-700">Impreso:</span>
                  <span className="ml-2">
                    {currentReceipt.isPrinted ? 
                      `Sí (${currentReceipt.printCount} veces)` : 
                      'No'
                    }
                  </span>
                </div>
                {currentReceipt.paymentMethod && (
                  <div>
                    <span className="text-green-700">Método de Pago:</span>
                    <span className="ml-2">{currentReceipt.paymentMethod}</span>
                  </div>
                )}
              </div>

              {currentReceipt.additionalNotes && (
                <div className="mb-4 p-3 bg-white border border-green-200 rounded">
                  <span className="text-green-700 font-medium">Notas:</span>
                  <p className="mt-1 text-gray-700">{currentReceipt.additionalNotes}</p>
                </div>
              )}
              /*
              <div className="flex flex-wrap gap-2">
                {/*<Button
                  size="sm"
                  onClick={() => handlePrint(currentReceipt.id)}
                  disabled={processing}
                >
                  🖨️ Imprimir
                </Button>
                */}
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadXml(currentReceipt.id)}
                  disabled={processing}
                >
                  📄 Descargar XML
                </Button>
                
                {/*<Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadPdf(currentReceipt.id)}
                  disabled={processing}
                >
                  📑 Descargar PDF
                </Button>*/}
              </div>
            </div>

            {/* Email Section for Existing Receipt */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-3">Enviar por Email</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={emailData.recipientEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEmailData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                />
                <Button
                  size="sm"
                  onClick={() => emailData.recipientEmail && 
                    handleSendEmail(currentReceipt.id, emailData.recipientEmail)}
                  disabled={processing || !emailData.recipientEmail}
                >
                  📧 Enviar Email
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Generate New Receipt Form - SIMPLIFICADO */
          <div className="space-y-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Recibo</h3>
              
              <div className="space-y-4">
                <Select
                  label="Método de Pago*"
                  value={formData.paymentMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleInputChange('paymentMethod', e.target.value)}
                  options={paymentMethodOptions}
                  error={errors.paymentMethod}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                      handleInputChange('additionalNotes', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    placeholder="Información adicional para el recibo (opcional)"
                  />
                  {errors.additionalNotes && (
                    <p className="mt-1 text-sm text-red-600">{errors.additionalNotes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.additionalNotes.length}/500 caracteres
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Acción después de generar:</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setAction('print');
                    handleGenerateReceipt();
                  }}
                  disabled={processing}
                  isLoading={processing && action === 'print'}
                >
                  🖨️ Generar e Imprimir
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAction('download');
                    handleGenerateReceipt();
                  }}
                  disabled={processing}
                  isLoading={processing && action === 'download'}
                >
                  💾 Solo Generar
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                💡 Una vez generado el recibo, podrás enviarlo por email desde las opciones del recibo.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={processing}
          >
            {currentReceipt ? 'Cerrar' : 'Cancelar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};