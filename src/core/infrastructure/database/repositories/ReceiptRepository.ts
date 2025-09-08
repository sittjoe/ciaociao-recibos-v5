import { Injectable, Inject } from '../../di/index.js';
import { Receipt } from '../../../domain/entities/Receipt.js';
import { IReceiptRepository, ReceiptFilter } from '../../../domain/repositories/IReceiptRepository.js';
import { BaseRepository } from '../../../domain/repositories/base/IRepository.js';
import { DatabaseContext } from '../DatabaseContext.js';

@Injectable()
export class ReceiptRepository extends BaseRepository<Receipt, ReceiptFilter> implements IReceiptRepository {
  constructor(@Inject(DatabaseContext) private db: DatabaseContext) {
    super();
  }

  async findById(id: string): Promise<Receipt | null> {
    const receipt = await this.db.receipts.get(id);
    return receipt || null;
  }

  async findAll(): Promise<Receipt[]> {
    return this.db.receipts.orderBy('createdAt').reverse().toArray();
  }

  async save(entity: Receipt): Promise<Receipt> {
    await this.db.receipts.put(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Receipt>): Promise<Receipt | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.receipts.put(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleteCount = await this.db.receipts.where('id').equals(id).delete();
    return deleteCount > 0;
  }

  async findByFilter(filter: ReceiptFilter): Promise<Receipt[]> {
    let query = this.db.receipts.toCollection();

    if (filter.clientId) {
      query = this.db.receipts.where('clientId').equals(filter.clientId);
    }

    if (filter.status) {
      query = query.and(receipt => receipt.status === filter.status);
    }

    if (filter.dateFrom) {
      query = query.and(receipt => receipt.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      query = query.and(receipt => receipt.createdAt <= filter.dateTo!);
    }

    if (filter.receiptNumber) {
      query = query.and(receipt => receipt.receiptNumber.includes(filter.receiptNumber!));
    }

    if (filter.amountMin !== undefined) {
      query = query.and(receipt => receipt.total >= filter.amountMin!);
    }

    if (filter.amountMax !== undefined) {
      query = query.and(receipt => receipt.total <= filter.amountMax!);
    }

    if (filter.search) {
      const searchTerms = filter.search.toLowerCase().split(' ').filter(term => term.length >= 2);
      query = query.and(receipt => {
        const searchableText = [
          receipt.receiptNumber,
          receipt.notes,
          ...receipt.items.map(item => item.description)
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    return query.reverse().sortBy('createdAt');
  }

  async findByReceiptNumber(receiptNumber: string): Promise<Receipt | null> {
    const receipt = await this.db.receipts.where('receiptNumber').equals(receiptNumber).first();
    return receipt || null;
  }

  async findByClientId(clientId: string): Promise<Receipt[]> {
    return this.db.receipts
      .where('clientId')
      .equals(clientId)
      .reverse()
      .sortBy('createdAt');
  }

  async findByStatus(status: Receipt['status']): Promise<Receipt[]> {
    return this.db.receipts
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('createdAt');
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]> {
    return this.db.receipts
      .where('createdAt')
      .between(startDate, endDate)
      .reverse()
      .sortBy('createdAt');
  }

  async findCompletedReceipts(): Promise<Receipt[]> {
    return this.findByStatus('completed');
  }

  async findDraftReceipts(): Promise<Receipt[]> {
    return this.findByStatus('draft');
  }

  async findReceiptsWithOutstandingBalance(): Promise<Receipt[]> {
    const allReceipts = await this.db.receipts.toArray();
    return allReceipts.filter(receipt => 
      receipt.status !== 'cancelled' && 
      receipt.status !== 'refunded' && 
      receipt.getRemainingBalance() > 0
    );
  }

  async getTotalRevenueByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const receipts = await this.db.receipts
      .where('createdAt')
      .between(startDate, endDate)
      .and(receipt => receipt.status === 'completed')
      .toArray();
    
    return receipts.reduce((total, receipt) => total + receipt.total, 0);
  }

  async getReceiptCountByStatus(): Promise<Record<Receipt['status'], number>> {
    const receipts = await this.db.receipts.toArray();
    
    const counts: Record<Receipt['status'], number> = {
      draft: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    
    receipts.forEach(receipt => {
      counts[receipt.status]++;
    });
    
    return counts;
  }

  async getNextReceiptNumber(): Promise<string> {
    const lastReceipt = await this.db.receipts
      .orderBy('receiptNumber')
      .reverse()
      .first();
    
    if (!lastReceipt) {
      return 'REC-0001';
    }
    
    // Extract number from receipt number (assumes format like REC-0001)
    const match = lastReceipt.receiptNumber.match(/\d+$/);
    if (match) {
      const nextNumber = parseInt(match[0]) + 1;
      return `REC-${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Fallback if format doesn't match
    const count = await this.db.receipts.count();
    return `REC-${(count + 1).toString().padStart(4, '0')}`;
  }
}
