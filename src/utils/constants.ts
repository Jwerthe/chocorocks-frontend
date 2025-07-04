// src/utils/constants.ts
export const CONSTANTS = {
  APP_NAME: 'Chocorocks',
  APP_VERSION: '1.0.0',
  
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
  },
  
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
  },
  
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 50,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    CODE_MAX_LENGTH: 50,
  },
  
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },
  
  ALERTS: {
    STOCK_LOW_THRESHOLD: 10,
    EXPIRY_WARNING_DAYS: 30,
    EXPIRY_CRITICAL_DAYS: 7,
  },
  
  COLORS: {
    PRIMARY: '#7ca1eb',
    SECONDARY: '#6b90da',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  
  LOCAL_STORAGE_KEYS: {
    USER_PREFERENCES: 'chocorocks_user_preferences',
    FILTERS: 'chocorocks_filters',
    THEME: 'chocorocks_theme',
  },
};