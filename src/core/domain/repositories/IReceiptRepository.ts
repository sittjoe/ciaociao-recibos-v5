import { Receipt } from '../entities/Receipt.js';
import { IPaginatedRepository } from './base/IRepository.js';

export interface ReceiptFilter {
  clientId?: string;
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  dateFrom?: Date;
  dateTo?: Date;
  receiptNumber?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

export interface IReceiptRepository extends IPaginatedRepository<Receipt, ReceiptFilter> {
  findByReceiptNumber(receiptNumber: string): Promise<Receipt | null>;
  findByClientId(clientId: string): Promise<Receipt[]>;
  findByStatus(status: Receipt['status']): Promise<Receipt[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]>;
  findCompletedReceipts(): Promise<Receipt[]>;
  findDraftReceipts(): Promise<Receipt[]>;
  findReceiptsWithOutstandingBalance(): Promise<Receipt[]>;
  getTotalRevenueByDateRange(startDate: Date, endDate: Date): Promise<number>;
  getReceiptCountByStatus(): Promise<Record<Receipt['status'], number>>;
  getNextReceiptNumber(): Promise<string>;
}
