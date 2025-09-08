import { v4 as uuidv4 } from 'uuid';

export interface QuotationItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  material?: string;
  karat?: number;
  laborCost?: number;
  materialCost?: number;
}

export interface QuotationDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
}

export class Quotation {
  public readonly id: string;
  public quotationNumber: string;
  public clientId: string;
  public title: string;
  public description?: string;
  public items: QuotationItem[];
  public discount?: QuotationDiscount;
  public subtotal: number;
  public discountAmount: number;
  public total: number;
  public validUntil: Date;
  public status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';
  public notes?: string;
  public createdAt: Date;
  public updatedAt: Date;
  public sentAt?: Date;
  public respondedAt?: Date;
  public convertedReceiptId?: string;

  constructor(
    quotationNumber: string,
    clientId: string,
    title: string,
    validityDays: number = 30
  ) {
    this.id = uuidv4();
    this.quotationNumber = quotationNumber;
    this.clientId = clientId;
    this.title = title;
    this.items = [];
    this.subtotal = 0;
    this.discountAmount = 0;
    this.total = 0;
    this.validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
    this.status = 'draft';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public addItem(item: QuotationItem): void {
    this.items.push(item);
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public removeItem(itemId: string): void {
    this.items = this.items.filter(item => item.id !== itemId);
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public updateItem(itemId: string, updates: Partial<QuotationItem>): void {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      this.items[itemIndex] = { ...this.items[itemIndex], ...updates };
      if (updates.quantity || updates.unitPrice) {
        this.items[itemIndex].totalPrice =
          this.items[itemIndex].quantity * this.items[itemIndex].unitPrice;
      }
      this.calculateTotals();
      this.updatedAt = new Date();
    }
  }

  public applyDiscount(discount: QuotationDiscount): void {
    this.discount = discount;
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public removeDiscount(): void {
    delete this.discount;
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public extendValidity(days: number): void {
    this.validUntil = new Date(this.validUntil.getTime() + days * 24 * 60 * 60 * 1000);
    this.updatedAt = new Date();
  }

  public isExpired(): boolean {
    return new Date() > this.validUntil;
  }

  public send(): void {
    if (this.status === 'draft') {
      this.status = 'sent';
      this.sentAt = new Date();
      this.updatedAt = new Date();
    } else {
      throw new Error('Only draft quotations can be sent');
    }
  }

  public accept(): void {
    if (this.status === 'sent' && !this.isExpired()) {
      this.status = 'accepted';
      this.respondedAt = new Date();
      this.updatedAt = new Date();
    } else {
      throw new Error('Cannot accept this quotation');
    }
  }

  public decline(): void {
    if (this.status === 'sent') {
      this.status = 'declined';
      this.respondedAt = new Date();
      this.updatedAt = new Date();
    } else {
      throw new Error('Cannot decline this quotation');
    }
  }

  public markAsExpired(): void {
    if (this.isExpired() && this.status === 'sent') {
      this.status = 'expired';
      this.updatedAt = new Date();
    }
  }

  public convertToReceipt(receiptId: string): void {
    if (this.status === 'accepted') {
      this.status = 'converted';
      this.convertedReceiptId = receiptId;
      this.updatedAt = new Date();
    } else {
      throw new Error('Only accepted quotations can be converted to receipts');
    }
  }

  private calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    this.discountAmount = 0;
    if (this.discount) {
      if (this.discount.type === 'percentage') {
        this.discountAmount = (this.subtotal * this.discount.value) / 100;
      } else {
        this.discountAmount = this.discount.value;
      }
    }
    
    this.total = this.subtotal - this.discountAmount;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      quotationNumber: this.quotationNumber,
      clientId: this.clientId,
      title: this.title,
      description: this.description,
      items: this.items,
      discount: this.discount,
      subtotal: this.subtotal,
      discountAmount: this.discountAmount,
      total: this.total,
      validUntil: this.validUntil.toISOString(),
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      sentAt: this.sentAt?.toISOString(),
      respondedAt: this.respondedAt?.toISOString(),
      convertedReceiptId: this.convertedReceiptId,
    };
  }
}