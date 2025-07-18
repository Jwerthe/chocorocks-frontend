// src/utils/validators.ts
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },


  phone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remover espacios, guiones y paréntesis
    
    // Patrones para números ecuatorianos
    const patterns = [
      /^09\d{8}$/,           // Celular: 09XXXXXXXX (10 dígitos)
      /^0[2-7]\d{7}$/,       // Fijo: 0X-XXXXXXX (9 dígitos)
      /^\+5939\d{8}$/,       // Internacional celular: +5939XXXXXXXX
      /^\+593[2-7]\d{7}$/,   // Internacional fijo: +593X-XXXXXXX
      /^[2-7]\d{7}$/,        // Fijo sin código: XXXXXXXX (8 dígitos)
      /^9\d{8}$/             // Celular sin código: 9XXXXXXXX (9 dígitos)
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  },



  cedula: (cedula: string): boolean => {
    if (cedula.length !== 10) return false;
    
    const digits = cedula.split('').map(Number);
    const provinceCode = parseInt(cedula.substring(0, 2));
    
    if (provinceCode < 1 || provinceCode > 24) return false;
    
    const lastDigit = digits[9];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);
    return verifier === lastDigit;
  },

  ruc: (ruc: string): boolean => {
    if (ruc.length !== 13) return false;
    
    const thirdDigit = parseInt(ruc.charAt(2));
    
    // Persona Natural
    if (thirdDigit < 6) {
      return validators.cedula(ruc.substring(0, 10)) && ruc.substring(10) === '001';
    }
    
    // Sociedad Pública
    if (thirdDigit === 6) {
      const digits = ruc.substring(0, 9).split('').map(Number);
      const coefficients = [3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      
      for (let i = 0; i < 8; i++) {
        sum += digits[i] * coefficients[i];
      }
      
      const remainder = sum % 11;
      const verifier = remainder === 0 ? 0 : 11 - remainder;
      
      return verifier === digits[8] && ruc.substring(9) === '0001';
    }
    
    // Sociedad Privada
    if (thirdDigit === 9) {
      const digits = ruc.substring(0, 10).split('').map(Number);
      const coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      
      for (let i = 0; i < 9; i++) {
        sum += digits[i] * coefficients[i];
      }
      
      const remainder = sum % 11;
      const verifier = remainder === 0 ? 0 : 11 - remainder;
      
      return verifier === digits[9] && ruc.substring(10) === '001';
    }
    
    return false;
  },

  required: (value: any): boolean => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return value != null;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  numeric: (value: string): boolean => {
    return /^\d+$/.test(value);
  },

  decimal: (value: string): boolean => {
    return /^\d+(\.\d+)?$/.test(value);
  },

  alphanumeric: (value: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(value);
  },
};