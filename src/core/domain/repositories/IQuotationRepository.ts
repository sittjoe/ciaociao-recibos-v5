import { Quotation } from '../entities/Quotation.js';
import { IPaginatedRepository } from './base/IRepository.js';

export interface QuotationFilter {
  clientId?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';
  dateFrom?: Date;
  dateTo?: Date;
  quotationNumber?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  isExpired?: boolean;
}

export interface IQuotationRepository extends IPaginatedRepository<Quotation, QuotationFilter> {
  findByQuotationNumber(quotationNumber: string): Promise<Quotation | null>;
  findByClientId(clientId: string): Promise<Quotation[]>;
  findByStatus(status: Quotation['status']): Promise<Quotation[]>;
  findExpiredQuotations(): Promise<Quotation[]>;
  findQuotationsExpiringIn(days: number): Promise<Quotation[]>;
  findConvertibleQuotations(): Promise<Quotation[]>;
  getQuotationCountByStatus(): Promise<Record<Quotation['status'], number>>;
  getConversionRate(): Promise<number>;
  getAverageQuotationValue(): Promise<number>;
  getNextQuotationNumber(): Promise<string>;
}
