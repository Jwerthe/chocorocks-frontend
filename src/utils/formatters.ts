// src/utils/formatters.ts (NUEVO - REQUERIDO)

/**
 * Utilidades para formatear datos comunes en la aplicación
 */

export const formatters = {
  /**
   * Formatea un número como moneda
   */
  currency: (amount: number, currency: string = 'USD', locale: string = 'es-EC'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Formatea un número como porcentaje
   */
  percentage: (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Formatea un número con separadores de miles
   */
  number: (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Formatea una fecha
   */
  date: (date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options: Intl.DateTimeFormatOptions = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: '2-digit', month: 'short', year: 'numeric' },
      long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
    };

    return new Intl.DateTimeFormat('es-EC', options[format]).format(dateObj);
  },

  /**
   * Formatea una fecha con hora
   */
  dateTime: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj);
  },

  /**
   * Formatea texto para mostrar solo las primeras palabras
   */
  truncate: (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  /**
   * Formatea un nombre para mostrar iniciales
   */
  initials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Formatea un número de teléfono
   */
  phone: (phone: string): string => {
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
  identification: (id: string, type: 'CEDULA' | 'RUC' | 'PASAPORTE'): string => {
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
  stockStatus: (current: number, minimum: number): {
    status: 'normal' | 'low' | 'critical' | 'out';
    label: string;
    color: string;
  } => {
    if (current === 0) {
      return { status: 'out', label: 'Sin Stock', color: 'red' };
    }
    
    if (current <= minimum * 0.5) {
      return { status: 'critical', label: 'Stock Crítico', color: 'red' };
    }
    
    if (current <= minimum) {
      return { status: 'low', label: 'Stock Bajo', color: 'yellow' };
    }
    
    return { status: 'normal', label: 'Stock Normal', color: 'green' };
  },

  /**
   * Formatea el tamaño de archivo
   */
  fileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Formatea tiempo relativo (hace X tiempo)
   */
  timeAgo: (date: string | Date): string => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
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
  },

  /**
   * Formatea un código de producto o lote
   */
  code: (code: string, maxLength: number = 12): string => {
    if (code.length <= maxLength) return code.toUpperCase();
    return code.slice(0, maxLength - 3).toUpperCase() + '...';
  },

  /**
   * Formatea tipo de movimiento de inventario
   */
  movementType: (type: string): { label: string; color: string } => {
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
  movementReason: (reason: string): string => {
    const reasons = {
      'PRODUCTION': 'Producción',
      'SALE': 'Venta',
      'TRANSFER': 'Transferencia',
      'ADJUSTMENT': 'Ajuste',
      'DAMAGE': 'Daño',
      'EXPIRED': 'Vencido'
    };
    
    return reasons[reason as keyof typeof reasons] || reason;
  }
};

export default formatters;