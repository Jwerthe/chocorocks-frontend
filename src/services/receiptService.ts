// src/services/receiptService.ts (VERSIÓN FINAL - COMPATIBLE CON BACKEND)
import { 
  ReceiptResponse, 
  ReceiptRequest, 
  CompleteWithReceiptRequest,
  ReceiptStatus 
} from '@/types/receipts';

// Import the base ApiService class
class ApiService {
  protected baseUrl: string;

  constructor(endpoint: string) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://23.20.243.209:8080';
    this.baseUrl = `${apiBaseUrl}/chocorocks/api${endpoint}`;
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      // Get token from cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='));
      return tokenCookie ? tokenCookie.split('=')[1] : null;
    }
    return null;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = this.getAuthHeaders();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log(`📤 Request body:`, options.body);

    const response = await fetch(url, config);

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData: any = null;
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const responseText = await response.text();
        console.log(`📨 Raw response:`, responseText);
        
        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.log(`❌ Parsed error:`, errorData);
          } catch {
            errorMessage = responseText;
          }
        }
      } catch (e) {
        console.log(`⚠️ Could not read error response:`, e);
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`📥 Response data:`, data);
      return data;
    }

    return response as unknown as T;
  }

  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

class ReceiptService extends ApiService {
  constructor() {
    super('/receipts');
  }

  // ✅ CRUD operations
  async getAllReceipts(): Promise<ReceiptResponse[]> {
    return this.get<ReceiptResponse[]>('');
  }

  async getReceiptById(id: number): Promise<ReceiptResponse> {
    return this.get<ReceiptResponse>(`/${id}`);
  }

  async createReceipt(receipt: ReceiptRequest): Promise<ReceiptResponse> {
    return this.post<ReceiptResponse>('', receipt);
  }

  async updateReceipt(id: number, receipt: ReceiptRequest): Promise<ReceiptResponse> {
    return this.put<ReceiptResponse>(`/${id}`, receipt);
  }

  async deleteReceipt(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  // ✅ Special receipt operations
  async cancelReceipt(id: number): Promise<ReceiptResponse> {
    return this.post<ReceiptResponse>(`/${id}/cancel`);
  }

  async markAsPrinted(id: number): Promise<ReceiptResponse> {
    return this.post<ReceiptResponse>(`/${id}/mark-printed`);
  }

  async findBySaleId(saleId: number): Promise<ReceiptResponse | null> {
    try {
      return await this.get<ReceiptResponse>(`/by-sale/${saleId}`);
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return null;
      }
      throw error;
    }
  }

  async getReceiptsByStatus(status: ReceiptStatus): Promise<ReceiptResponse[]> {
    return this.get<ReceiptResponse[]>(`/status/${status}`);
  }

  async getReceiptsByStoreAndDateRange(
    storeId: number, 
    startDate: string, 
    endDate: string
  ): Promise<ReceiptResponse[]> {
    const params = new URLSearchParams({
      storeId: storeId.toString(),
      startDate,
      endDate
    });
    return this.get<ReceiptResponse[]>(`/by-store-date?${params.toString()}`);
  }

  // ✅ Generate receipt number
  async generateReceiptNumber(storeId: number): Promise<string> {
    return this.get<string>(`/generate-number/${storeId}`);
  }

  // ✅ XML operations
  async generateReceiptXml(receiptId: number): Promise<string> {
    return this.get<string>(`/${receiptId}/xml`);
  }

  async generateReceiptXmlBytes(receiptId: number): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${receiptId}/download-xml`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  }

  // ✅ Email operations
  async sendReceiptByEmail(
    receiptId: number, 
    recipientEmail: string, 
    additionalMessage?: string
  ): Promise<void> {
    const emailData = {
      recipientEmail,
      additionalMessage
    };
    return this.post<void>(`/${receiptId}/send-email`, emailData);
  }

  // ✅ Download receipt as PDF (if backend supports it)
  async downloadReceiptPdf(receiptId: number): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${receiptId}/pdf`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  }

  // ✅ Print receipt (browser print)
  async printReceipt(receiptId: number): Promise<void> {
    try {
      // Mark as printed in backend
      await this.markAsPrinted(receiptId);
      
      // Get receipt data for printing
      const receipt = await this.getReceiptById(receiptId);
      
      // Create print content
      const printContent = this.generatePrintContent(receipt);
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  // ✅ Generate print HTML content
  private generatePrintContent(receipt: ReceiptResponse): string {
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

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo - ${receipt.receiptNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 15px;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .section {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #000;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; padding: 10px; }
            .receipt { border: none; max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">CHOCOROCKS</div>
            <div>Recibo de Compra</div>
            <div>RUC: 1234567890001</div>
          </div>
          
          <div class="section">
            <div class="row">
              <span>Recibo #:</span>
              <span>${receipt.receiptNumber}</span>
            </div>
            <div class="row">
              <span>Fecha:</span>
              <span>${formatDate(receipt.issueDate)}</span>
            </div>
            <div class="row">
              <span>Tienda:</span>
              <span>${receipt.store.name}</span>
            </div>
            <div class="row">
              <span>Vendedor:</span>
              <span>${receipt.user.name}</span>
            </div>
            ${receipt.client ? `
            <div class="row">
              <span>Cliente:</span>
              <span>${receipt.client.nameLastname}</span>
            </div>
            ` : ''}
            ${receipt.paymentMethod ? `
            <div class="row">
              <span>Pago:</span>
              <span>${receipt.paymentMethod}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
              DETALLE DE PRODUCTOS
            </div>
            <div class="row">
              <span>Venta #:</span>
              <span>${receipt.sale.saleNumber}</span>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <span>Subtotal:</span>
              <span>${formatCurrency(receipt.subtotal)}</span>
            </div>
            ${receipt.discountAmount > 0 ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-${formatCurrency(receipt.discountAmount)}</span>
            </div>
            ` : ''}
            <div class="row">
              <span>IVA (${receipt.taxPercentage}%):</span>
              <span>${formatCurrency(receipt.taxAmount)}</span>
            </div>
            <div class="row total-row">
              <span>TOTAL:</span>
              <span>${formatCurrency(receipt.totalAmount)}</span>
            </div>
          </div>

          ${receipt.additionalNotes ? `
          <div class="section">
            <div style="font-weight: bold;">Notas:</div>
            <div>${receipt.additionalNotes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div>Este recibo fue generado electrónicamente</div>
            <div>Impreso: ${new Date().toLocaleString('es-ES')}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// ✅ Sale Service extension for complete with receipt
class SaleReceiptService extends ApiService {
  constructor() {
    super('/sales');
  }

  async completeWithReceipt(
    saleId: number, 
    data: CompleteWithReceiptRequest
  ): Promise<ReceiptResponse> {
    console.log(`🧾 Completing sale ${saleId} with receipt:`, data);
    
    // ✅ ESTRUCTURA EXACTA QUE ESPERA EL BACKEND
    const backendPayload = this.formatForBackend(data);
    
    console.log(`📤 Formatted payload for backend:`, backendPayload);
    
    return this.post<ReceiptResponse>(`/${saleId}/complete-with-receipt`, backendPayload);
  }

  // ✅ NUEVO: Formatear datos según la estructura exacta del backend
  private formatForBackend(data: CompleteWithReceiptRequest): any {
    const payload: any = {};
    
    // 1. paymentMethod es REQUERIDO y debe estar en MAYÚSCULAS
    if (data.paymentMethod) {
      payload.paymentMethod = data.paymentMethod.toUpperCase();
    } else {
      // Si no hay método de pago, usar EFECTIVO por defecto
      payload.paymentMethod = 'EFECTIVO';
    }
    
    // 2. additionalNotes es OPCIONAL
    if (data.additionalNotes && data.additionalNotes.trim()) {
      payload.additionalNotes = data.additionalNotes.trim();
    }
    
    // ✅ IMPORTANTE: NO incluir otros campos como customerName, customerIdentification, etc.
    // El backend solo acepta paymentMethod y additionalNotes
    
    return payload;
  }

  // ✅ HELPER: Mapear métodos de pago a formato del backend
  private normalizePaymentMethod(method: string): string {
    const mappings: Record<string, string> = {
      'efectivo': 'EFECTIVO',
      'tarjeta de crédito': 'TARJETA_CREDITO',
      'tarjeta de débito': 'TARJETA_DEBITO',
      'transferencia': 'TRANSFERENCIA',
      'transferencia bancaria': 'TRANSFERENCIA',
      'cheque': 'CHEQUE',
      'mixto': 'MIXTO',
      'pago mixto': 'MIXTO'
    };
    
    const normalized = mappings[method.toLowerCase()];
    return normalized || method.toUpperCase();
  }
}

// Export instances
export const receiptService = new ReceiptService();
export const saleReceiptService = new SaleReceiptService();
export { ReceiptService, SaleReceiptService };