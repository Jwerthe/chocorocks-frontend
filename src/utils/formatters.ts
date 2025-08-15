// src/utils/formatters.ts - CORREGIDO con validaciones
/**
 * Utilidades para formatear datos comunes en la aplicación
 */

export const formatters = {
  /**
   * Formatea un número como moneda
   */
  currency: (amount: number | null | undefined, currency: string = 'USD', locale: string = 'es-EC'): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Formatea un número como porcentaje - ✅ CORREGIDO
   */
  percentage: (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Formatea un número con separadores de miles
   */
  number: (value: number | null | undefined, decimals: number = 0): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Formatea una fecha
   */
  date: (date: string | Date | null | undefined, format: 'short' | 'medium' | 'long' = 'medium'): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      const options: Intl.DateTimeFormatOptions = {
        short: { day: '2-digit', month: '2-digit', year: 'numeric' },
        medium: { day: '2-digit', month: 'short', year: 'numeric' },
        long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      };

      return new Intl.DateTimeFormat('es-EC', options[format]).format(dateObj);
    } catch (error) {
      return 'Fecha inválida';
    }
  },

  /**
   * Formatea una fecha con hora
   */
  dateTime: (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return new Intl.DateTimeFormat('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(dateObj);
    } catch (error) {
      return 'Fecha inválida';
    }
  },

  /**
   * Formatea texto para mostrar solo las primeras palabras
   */
  truncate: (text: string | null | undefined, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  /**
   * Formatea un nombre para mostrar iniciales
   */
  initials: (name: string | null | undefined): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Formatea un número de teléfono
   */
  phone: (phone: string | null | undefined): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return phone;
  },

  /**
   * Formatea un RUC o cédula
   */
  identification: (id: string | null | undefined, type: 'CEDULA' | 'RUC' | 'PASAPORTE'): string => {
    if (!id) return '';
    
    if (type === 'CEDULA' && id.length === 10) {
      return id.replace(/(\d{2})(\d{8})/, '$1-$2');
    }
    
    if (type === 'RUC' && id.length === 13) {
      return id.replace(/(\d{2})(\d{8})(\d{3})/, '$1-$2-$3');
    }
    
    return id;
  },

  /**
   * Formatea el estado de stock
   */
  stockStatus: (current: number | null | undefined, minimum: number | null | undefined): {
    status: 'normal' | 'low' | 'critical' | 'out';
    label: string;
    color: string;
  } => {
    const currentStock = current || 0;
    const minStock = minimum || 0;
    
    if (currentStock === 0) {
      return { status: 'out', label: 'Sin Stock', color: 'red' };
    }
    
    if (currentStock <= minStock * 0.5) {
      return { status: 'critical', label: 'Stock Crítico', color: 'red' };
    }
    
    if (currentStock <= minStock) {
      return { status: 'low', label: 'Stock Bajo', color: 'yellow' };
    }
    
    return { status: 'normal', label: 'Stock Normal', color: 'green' };
  },

  /**
   * Formatea el tamaño de archivo
   */
  fileSize: (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Formatea tiempo relativo (hace X tiempo)
   */
  timeAgo: (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const now = new Date();
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

      const intervals = {
        año: 31536000,
        mes: 2592000,
        semana: 604800,
        día: 86400,
        hora: 3600,
        minuto: 60
      };

      for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds);
        if (interval >= 1) {
          return interval === 1 ? `hace 1 ${unit}` : `hace ${interval} ${unit}s`;
        }
      }

      return 'hace un momento';
    } catch (error) {
      return 'Fecha inválida';
    }
  },

  /**
   * Formatea un código de producto o lote
   */
  code: (code: string | null | undefined, maxLength: number = 12): string => {
    if (!code) return '';
    if (code.length <= maxLength) return code.toUpperCase();
    return code.slice(0, maxLength - 3).toUpperCase() + '...';
  },

  /**
   * Formatea tipo de movimiento de inventario
   */
  movementType: (type: string | null | undefined): { label: string; color: string } => {
    if (!type) return { label: 'N/A', color: 'gray' };
    
    const types = {
      'IN': { label: 'Entrada', color: 'green' },
      'OUT': { label: 'Salida', color: 'red' },
      'TRANSFER': { label: 'Transferencia', color: 'blue' }
    };
    
    return types[type as keyof typeof types] || { label: type, color: 'gray' };
  },

  /**
   * Formatea razón de movimiento
   */
  movementReason: (reason: string | null | undefined): string => {
    if (!reason) return '';
    
    const reasons = {
      'PRODUCTION': 'Producción',
      'SALE': 'Venta',
      'TRANSFER': 'Transferencia',
      'ADJUSTMENT': 'Ajuste',
      'DAMAGE': 'Daño',
      'EXPIRED': 'Vencido'
    };
    
    return reasons[reason as keyof typeof reasons] || reason;
  },

  /**
   * ✅ NUEVO: Función segura para renderizar valores numéricos
   */
  safeNumber: (value: number | null | undefined): number => {
    return value || 0;
  },

  /**
   * ✅ NUEVO: Función segura para renderizar strings
   */
  safeString: (value: string | null | undefined): string => {
    return value || '';
  }
};

export default formatters;