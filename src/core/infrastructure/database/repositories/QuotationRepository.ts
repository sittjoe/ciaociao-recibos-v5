import { Injectable, Inject } from '../../di/index.js';
import { Quotation } from '../../../domain/entities/Quotation.js';
import { IQuotationRepository, QuotationFilter } from '../../../domain/repositories/IQuotationRepository.js';
import { BaseRepository } from '../../../domain/repositories/base/IRepository.js';
import { DatabaseContext } from '../DatabaseContext.js';

@Injectable()
export class QuotationRepository extends BaseRepository<Quotation, QuotationFilter> implements IQuotationRepository {
  constructor(@Inject(DatabaseContext) private db: DatabaseContext) {
    super();
  }

  async findById(id: string): Promise<Quotation | null> {
    const quotation = await this.db.quotations.get(id);
    return quotation || null;
  }

  async findAll(): Promise<Quotation[]> {
    return this.db.quotations.orderBy('createdAt').reverse().toArray();
  }

  async save(entity: Quotation): Promise<Quotation> {
    await this.db.quotations.put(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Quotation>): Promise<Quotation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.quotations.put(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleteCount = await this.db.quotations.where('id').equals(id).delete();
    return deleteCount > 0;
  }

  async findByFilter(filter: QuotationFilter): Promise<Quotation[]> {
    let query = this.db.quotations.toCollection();

    if (filter.clientId) {
      query = this.db.quotations.where('clientId').equals(filter.clientId);
    }

    if (filter.status) {
      query = query.and(quotation => quotation.status === filter.status);
    }

    if (filter.dateFrom) {
      query = query.and(quotation => quotation.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      query = query.and(quotation => quotation.createdAt <= filter.dateTo!);
    }

    if (filter.quotationNumber) {
      query = query.and(quotation => quotation.quotationNumber.includes(filter.quotationNumber!));
    }

    if (filter.amountMin !== undefined) {
      query = query.and(quotation => quotation.total >= filter.amountMin!);
    }

    if (filter.amountMax !== undefined) {
      query = query.and(quotation => quotation.total <= filter.amountMax!);
    }

    if (filter.isExpired !== undefined) {
      const now = new Date();
      if (filter.isExpired) {
        query = query.and(quotation => quotation.validUntil < now);
      } else {
        query = query.and(quotation => quotation.validUntil >= now);
      }
    }

    if (filter.search) {
      const searchTerms = filter.search.toLowerCase().split(' ').filter(term => term.length >= 2);
      query = query.and(quotation => {
        const searchableText = [
          quotation.quotationNumber,
          quotation.title,
          quotation.description,
          quotation.notes,
          ...quotation.items.map(item => item.description)
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    return query.reverse().sortBy('createdAt');
  }

  async findByQuotationNumber(quotationNumber: string): Promise<Quotation | null> {
    const quotation = await this.db.quotations.where('quotationNumber').equals(quotationNumber).first();
    return quotation || null;
  }

  async findByClientId(clientId: string): Promise<Quotation[]> {
    return this.db.quotations
      .where('clientId')
      .equals(clientId)
      .reverse()
      .sortBy('createdAt');
  }

  async findByStatus(status: Quotation['status']): Promise<Quotation[]> {
    return this.db.quotations
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('createdAt');
  }

  async findExpiredQuotations(): Promise<Quotation[]> {
    const now = new Date();
    return this.db.quotations
      .where('validUntil')
      .below(now)
      .and(quotation => quotation.status === 'sent')
      .toArray();
  }

  async findQuotationsExpiringIn(days: number): Promise<Quotation[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return this.db.quotations
      .where('validUntil')
      .between(now, futureDate)
      .and(quotation => quotation.status === 'sent')
      .toArray();
  }

  async findConvertibleQuotations(): Promise<Quotation[]> {
    return this.db.quotations
      .where('status')
      .equals('accepted')
      .toArray();
  }

  async getQuotationCountByStatus(): Promise<Record<Quotation['status'], number>> {
    const quotations = await this.db.quotations.toArray();
    
    const counts: Record<Quotation['status'], number> = {
      draft: 0,
      sent: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      converted: 0,
    };
    
    quotations.forEach(quotation => {
      counts[quotation.status]++;
    });
    
    return counts;
  }

  async getConversionRate(): Promise<number> {
    const quotations = await this.db.quotations.toArray();
    const sentQuotations = quotations.filter(q => ['sent', 'accepted', 'declined', 'expired', 'converted'].includes(q.status));
    const acceptedQuotations = quotations.filter(q => ['accepted', 'converted'].includes(q.status));
    
    if (sentQuotations.length === 0) return 0;
    return acceptedQuotations.length / sentQuotations.length;
  }

  async getAverageQuotationValue(): Promise<number> {
    const quotations = await this.db.quotations.toArray();
    if (quotations.length === 0) return 0;
    
    const total = quotations.reduce((sum, quotation) => sum + quotation.total, 0);
    return total / quotations.length;
  }

  async getNextQuotationNumber(): Promise<string> {
    const lastQuotation = await this.db.quotations
      .orderBy('quotationNumber')
      .reverse()
      .first();
    
    if (!lastQuotation) {
      return 'QUO-0001';
    }
    
    // Extract number from quotation number (assumes format like QUO-0001)
    const match = lastQuotation.quotationNumber.match(/\d+$/);
    if (match) {
      const nextNumber = parseInt(match[0]) + 1;
      return `QUO-${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Fallback if format doesn't match
    const count = await this.db.quotations.count();
    return `QUO-${(count + 1).toString().padStart(4, '0')}`;
  }
}
