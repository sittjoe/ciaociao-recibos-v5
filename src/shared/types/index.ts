// Entity exports for easy importing
export type { ReceiptItem, ReceiptPayment, ReceiptTax } from '@/core/domain/entities/Receipt';
export { Receipt } from '@/core/domain/entities/Receipt';

export type { QuotationItem, QuotationDiscount } from '@/core/domain/entities/Quotation';
export { Quotation } from '@/core/domain/entities/Quotation';

export type { ClientAddress, ClientContact, ClientPreferences } from '@/core/domain/entities/Client';
export { Client } from '@/core/domain/entities/Client';

export type {
  ProductCategory,
  MetalType,
  GemstoneType,
  ProductSpecs,
  ProductPricing,
} from '@/core/domain/entities/Product';
export { Product } from '@/core/domain/entities/Product';

export type { PaymentMethod, PaymentStatus, PaymentDetails } from '@/core/domain/entities/Payment';
export { Payment } from '@/core/domain/entities/Payment';

// Common application types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FilterOptions {
  search?: string;
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  [key: string]: unknown;
}

// Form types
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// UI types
export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoHide?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  lastUpdated?: Date;
}

// Business types
export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  logo?: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
}

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  clientIds?: string[];
  productCategories?: string[];
  paymentMethods?: string[];
  statuses?: string[];
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  avgOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  clientsGrowth: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'receipt' | 'quotation' | 'client' | 'payment';
    description: string;
    amount?: number;
    date: Date;
  }>;
}