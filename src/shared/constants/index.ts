// Application constants
export const APP_NAME = 'Ciao Ciao Jewelry';
export const APP_VERSION = '5.0.0';

// API constants
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Database constants
export const DB_NAME = import.meta.env.VITE_DB_NAME || 'ciaociao_jewelry_v5';
export const DB_VERSION = Number(import.meta.env.VITE_DB_VERSION) || 1;

// Business constants
export const BUSINESS_INFO = {
  name: import.meta.env.VITE_BUSINESS_NAME || 'Ciao Ciao Jewelry',
  address: import.meta.env.VITE_BUSINESS_ADDRESS || '',
  phone: import.meta.env.VITE_BUSINESS_PHONE || '',
  email: import.meta.env.VITE_BUSINESS_EMAIL || '',
};

// Currency and formatting
export const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'USD';
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || '$';
export const DEFAULT_TAX_RATE = Number(import.meta.env.VITE_DEFAULT_TAX_RATE) || 0.08;
export const TAX_LABEL = import.meta.env.VITE_TAX_LABEL || 'Sales Tax';

// Product categories
export const PRODUCT_CATEGORIES = [
  'rings',
  'necklaces',
  'bracelets',
  'earrings',
  'watches',
  'loose-stones',
  'custom',
  'repair',
  'other',
] as const;

// Metal types
export const METAL_TYPES = [
  'gold',
  'silver',
  'platinum',
  'palladium',
  'stainless-steel',
  'titanium',
  'other',
] as const;

// Gemstone types
export const GEMSTONE_TYPES = [
  'diamond',
  'ruby',
  'sapphire',
  'emerald',
  'pearl',
  'opal',
  'turquoise',
  'amethyst',
  'topaz',
  'other',
] as const;

// Payment methods
export const PAYMENT_METHODS = [
  'cash',
  'card',
  'check',
  'transfer',
  'crypto',
  'layaway',
  'trade-in',
  'store-credit',
] as const;

// Status options
export const RECEIPT_STATUSES = ['draft', 'completed', 'cancelled', 'refunded'] as const;
export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted'] as const;
export const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'] as const;

// Validation constants
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 1000,
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,
  MIN_WEIGHT: 0.01,
  MAX_WEIGHT: 99999.99,
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Feature flags
export const FEATURES = {
  ANALYTICS_ENABLED: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  BACKUPS_ENABLED: import.meta.env.VITE_ENABLE_BACKUPS !== 'false',
  EXPORT_ENABLED: import.meta.env.VITE_ENABLE_EXPORT !== 'false',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION: 'Please check your input and try again.',
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  DELETE_FAILED: 'Failed to delete item. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  CREATED: 'Item created successfully',
  UPDATED: 'Item updated successfully',
  DELETED: 'Item deleted successfully',
  SENT: 'Item sent successfully',
  IMPORTED: 'Data imported successfully',
  EXPORTED: 'Data exported successfully',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'ciaociao_user_preferences',
  THEME: 'ciaociao_theme',
  LANGUAGE: 'ciaociao_language',
  LAST_BACKUP: 'ciaociao_last_backup',
  RECENT_CLIENTS: 'ciaociao_recent_clients',
  RECENT_PRODUCTS: 'ciaociao_recent_products',
} as const;