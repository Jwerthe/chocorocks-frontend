// src/hooks/useReceipts.ts
import { useState, useCallback } from 'react';
import { 
  ReceiptResponse, 
  ReceiptRequest, 
  CompleteWithReceiptRequest,
  ReceiptStatus 
} from '@/types/receipts';
import { receiptService, saleReceiptService } from '@/services/receiptService';

interface UseReceiptsState {
  receipts: ReceiptResponse[];
  currentReceipt: ReceiptResponse | null;
  loading: boolean;
  error: string | null;
  processing: boolean;
}

interface UseReceiptsReturn extends UseReceiptsState {
  // CRUD operations
  createReceipt: (receipt: ReceiptRequest) => Promise<ReceiptResponse>;
  updateReceipt: (id: number, receipt: ReceiptRequest) => Promise<ReceiptResponse>;
  deleteReceipt: (id: number) => Promise<void>;
  getReceiptById: (id: number) => Promise<ReceiptResponse>;
  findReceiptBySale: (saleId: number) => Promise<ReceiptResponse | null>;
  refreshReceipts: () => Promise<void>;
  
  // Special operations
  completeWithReceipt: (saleId: number, data: CompleteWithReceiptRequest) => Promise<ReceiptResponse>;
  printReceipt: (receiptId: number) => Promise<void>;
  sendReceiptByEmail: (receiptId: number, email: string, message?: string) => Promise<void>;
  cancelReceipt: (id: number) => Promise<ReceiptResponse>;
  markAsPrinted: (id: number) => Promise<ReceiptResponse>;
  downloadXml: (receiptId: number) => Promise<void>;
  downloadPdf: (receiptId: number) => Promise<void>;
  
  // Utility functions
  setCurrentReceipt: (receipt: ReceiptResponse | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Filter functions
  getReceiptsByStatus: (status: ReceiptStatus) => Promise<ReceiptResponse[]>;
  getReceiptsByDateRange: (storeId: number, startDate: string, endDate: string) => Promise<ReceiptResponse[]>;
}

export const useReceipts = (): UseReceiptsReturn => {
  const [state, setState] = useState<UseReceiptsState>({
    receipts: [],
    currentReceipt: null,
    loading: false,
    error: null,
    processing: false,
  });

  const setLoading = useCallback((loading: boolean): void => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setProcessing = useCallback((processing: boolean): void => {
    setState(prev => ({ ...prev, processing }));
  }, []);

  const setError = useCallback((error: string | null): void => {
    setState(prev => ({ ...prev, error, loading: false, processing: false }));
  }, []);

  const setReceipts = useCallback((receipts: ReceiptResponse[]): void => {
    setState(prev => ({ ...prev, receipts, loading: false, error: null }));
  }, []);

  const setCurrentReceipt = useCallback((receipt: ReceiptResponse | null): void => {
    setState(prev => ({ ...prev, currentReceipt: receipt }));
  }, []);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ✅ Load all receipts
  const refreshReceipts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const receipts = await receiptService.getAllReceipts();
      setReceipts(receipts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar recibos';
      setError(errorMessage);
    }
  }, [setLoading, setReceipts, setError]);

  // ✅ CRUD operations
  const createReceipt = useCallback(async (receiptData: ReceiptRequest): Promise<ReceiptResponse> => {
    try {
      setProcessing(true);
      const newReceipt = await receiptService.createReceipt(receiptData);
      setState(prev => ({
        ...prev,
        receipts: [...prev.receipts, newReceipt],
        processing: false,
        error: null
      }));
      return newReceipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  const updateReceipt = useCallback(async (id: number, receiptData: ReceiptRequest): Promise<ReceiptResponse> => {
    try {
      setProcessing(true);
      const updatedReceipt = await receiptService.updateReceipt(id, receiptData);
      setState(prev => ({
        ...prev,
        receipts: prev.receipts.map(receipt => 
          receipt.id === id ? updatedReceipt : receipt
        ),
        currentReceipt: prev.currentReceipt?.id === id ? updatedReceipt : prev.currentReceipt,
        processing: false,
        error: null
      }));
      return updatedReceipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  const deleteReceipt = useCallback(async (id: number): Promise<void> => {
    try {
      setProcessing(true);
      await receiptService.deleteReceipt(id);
      setState(prev => ({
        ...prev,
        receipts: prev.receipts.filter(receipt => receipt.id !== id),
        currentReceipt: prev.currentReceipt?.id === id ? null : prev.currentReceipt,
        processing: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  const getReceiptById = useCallback(async (id: number): Promise<ReceiptResponse> => {
    try {
      setLoading(true);
      const receipt = await receiptService.getReceiptById(id);
      setCurrentReceipt(receipt);
      setLoading(false);
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setLoading, setCurrentReceipt, setError]);

  const findReceiptBySale = useCallback(async (saleId: number): Promise<ReceiptResponse | null> => {
    try {
      setLoading(true);
      const receipt = await receiptService.findBySaleId(saleId);
      setCurrentReceipt(receipt);
      setLoading(false);
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al buscar recibo por venta';
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setCurrentReceipt, setError]);

  // ✅ Complete sale with receipt (MAIN FUNCTION)
  const completeWithReceipt = useCallback(async (
    saleId: number, 
    data: CompleteWithReceiptRequest
  ): Promise<ReceiptResponse> => {
    try {
      setProcessing(true);
      console.log('🧾 [useReceipts] Creating receipt for sale:', saleId, data);
      
      const receipt = await saleReceiptService.completeWithReceipt(saleId, data);
      
      console.log('✅ [useReceipts] Receipt created successfully:', receipt);
      
      setState(prev => ({
        ...prev,
        receipts: [...prev.receipts, receipt],
        currentReceipt: receipt,
        processing: false,
        error: null
      }));
      
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al generar recibo';
      console.error('❌ [useReceipts] Error creating receipt:', error);
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Print receipt
  const printReceipt = useCallback(async (receiptId: number): Promise<void> => {
    try {
      setProcessing(true);
      await receiptService.printReceipt(receiptId);
      
      // Update the receipt as printed
      setState(prev => ({
        ...prev,
        receipts: prev.receipts.map(receipt => 
          receipt.id === receiptId 
            ? { ...receipt, isPrinted: true, printCount: receipt.printCount + 1 }
            : receipt
        ),
        currentReceipt: prev.currentReceipt?.id === receiptId 
          ? { ...prev.currentReceipt, isPrinted: true, printCount: prev.currentReceipt.printCount + 1 }
          : prev.currentReceipt,
        processing: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al imprimir recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Send receipt by email
  const sendReceiptByEmail = useCallback(async (
    receiptId: number, 
    email: string, 
    message?: string
  ): Promise<void> => {
    try {
      setProcessing(true);
      await receiptService.sendReceiptByEmail(receiptId, email, message);
      setProcessing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar recibo por email';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Cancel receipt
  const cancelReceipt = useCallback(async (id: number): Promise<ReceiptResponse> => {
    try {
      setProcessing(true);
      const cancelledReceipt = await receiptService.cancelReceipt(id);
      setState(prev => ({
        ...prev,
        receipts: prev.receipts.map(receipt => 
          receipt.id === id ? cancelledReceipt : receipt
        ),
        currentReceipt: prev.currentReceipt?.id === id ? cancelledReceipt : prev.currentReceipt,
        processing: false,
        error: null
      }));
      return cancelledReceipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cancelar recibo';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Mark as printed
  const markAsPrinted = useCallback(async (id: number): Promise<ReceiptResponse> => {
    try {
      setProcessing(true);
      const printedReceipt = await receiptService.markAsPrinted(id);
      setState(prev => ({
        ...prev,
        receipts: prev.receipts.map(receipt => 
          receipt.id === id ? printedReceipt : receipt
        ),
        currentReceipt: prev.currentReceipt?.id === id ? printedReceipt : prev.currentReceipt,
        processing: false,
        error: null
      }));
      return printedReceipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al marcar como impreso';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Download XML
  const downloadXml = useCallback(async (receiptId: number): Promise<void> => {
    try {
      setProcessing(true);
      const xmlBlob = await receiptService.generateReceiptXmlBytes(receiptId);
      
      // Create download link
      const url = window.URL.createObjectURL(xmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-${receiptId}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setProcessing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al descargar XML';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Download PDF
  const downloadPdf = useCallback(async (receiptId: number): Promise<void> => {
    try {
      setProcessing(true);
      const pdfBlob = await receiptService.downloadReceiptPdf(receiptId);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setProcessing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al descargar PDF';
      setError(errorMessage);
      throw error;
    }
  }, [setProcessing, setError]);

  // ✅ Filter functions
  const getReceiptsByStatus = useCallback(async (status: ReceiptStatus): Promise<ReceiptResponse[]> => {
    try {
      setLoading(true);
      const receipts = await receiptService.getReceiptsByStatus(status);
      setLoading(false);
      return receipts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al filtrar recibos por estado';
      setError(errorMessage);
      return [];
    }
  }, [setLoading, setError]);

  const getReceiptsByDateRange = useCallback(async (
    storeId: number, 
    startDate: string, 
    endDate: string
  ): Promise<ReceiptResponse[]> => {
    try {
      setLoading(true);
      const receipts = await receiptService.getReceiptsByStoreAndDateRange(storeId, startDate, endDate);
      setLoading(false);
      return receipts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al filtrar recibos por fecha';
      setError(errorMessage);
      return [];
    }
  }, [setLoading, setError]);

  return {
    ...state,
    // CRUD operations
    createReceipt,
    updateReceipt,
    deleteReceipt,
    getReceiptById,
    findReceiptBySale,
    refreshReceipts,
    
    // Special operations
    completeWithReceipt,
    printReceipt,
    sendReceiptByEmail,
    cancelReceipt,
    markAsPrinted,
    downloadXml,
    downloadPdf,
    
    // Utility functions
    setCurrentReceipt,
    clearError,
    setLoading,
    
    // Filter functions
    getReceiptsByStatus,
    getReceiptsByDateRange,
  };
};