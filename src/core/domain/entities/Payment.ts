import { v4 as uuidv4 } from 'uuid';

export type PaymentMethod = 'cash' | 'card' | 'check' | 'transfer' | 'crypto' | 'layaway' | 'trade-in' | 'store-credit';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentDetails {
  // Card payments
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  lastFourDigits?: string;
  authCode?: string;
  
  // Check payments
  checkNumber?: string;
  bankName?: string;
  
  // Transfer payments
  transferReference?: string;
  bankAccount?: string;
  
  // Crypto payments
  cryptoCurrency?: string;
  walletAddress?: string;
  transactionHash?: string;
  
  // Trade-in details
  tradeInItems?: {
    description: string;
    estimatedValue: number;
    actualValue: number;
  }[];
}

export class Payment {
  public readonly id: string;
  public receiptId: string | undefined;
  public quotationId: string | undefined;
  public clientId: string;
  public method: PaymentMethod;
  public amount: number;
  public currency: string;
  public status: PaymentStatus;
  public details: PaymentDetails;
  public reference?: string;
  public notes?: string;
  public processedAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    clientId: string,
    method: PaymentMethod,
    amount: number,
    currency: string = 'USD',
    receiptId?: string,
    quotationId?: string
  ) {
    this.id = uuidv4();
    this.receiptId = receiptId;
    this.quotationId = quotationId;
    this.clientId = clientId;
    this.method = method;
    this.amount = amount;
    this.currency = currency;
    this.status = 'pending';
    this.details = {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public updateDetails(details: Partial<PaymentDetails>): void {
    this.details = { ...this.details, ...details };
    this.updatedAt = new Date();
  }

  public markAsProcessing(): void {
    if (this.status === 'pending') {
      this.status = 'processing';
      this.updatedAt = new Date();
    } else {
      throw new Error('Only pending payments can be marked as processing');
    }
  }

  public markAsCompleted(reference?: string): void {
    if (this.status === 'pending' || this.status === 'processing') {
      this.status = 'completed';
      this.processedAt = new Date();
      this.updatedAt = new Date();
      if (reference) {
        this.reference = reference;
      }
    } else {
      throw new Error('Only pending or processing payments can be completed');
    }
  }

  public markAsFailed(reason?: string): void {
    if (this.status === 'pending' || this.status === 'processing') {
      this.status = 'failed';
      this.updatedAt = new Date();
      if (reason) {
        this.notes = reason;
      }
    } else {
      throw new Error('Only pending or processing payments can be marked as failed');
    }
  }

  public cancel(reason?: string): void {
    if (this.status === 'pending') {
      this.status = 'cancelled';
      this.updatedAt = new Date();
      if (reason) {
        this.notes = reason;
      }
    } else {
      throw new Error('Only pending payments can be cancelled');
    }
  }

  public refund(reason?: string): void {
    if (this.status === 'completed') {
      this.status = 'refunded';
      this.updatedAt = new Date();
      if (reason) {
        this.notes = `${this.notes ? this.notes + ' | ' : ''}Refund: ${reason}`;
      }
    } else {
      throw new Error('Only completed payments can be refunded');
    }
  }

  public isSuccessful(): boolean {
    return this.status === 'completed';
  }

  public isFinal(): boolean {
    return ['completed', 'failed', 'cancelled', 'refunded'].includes(this.status);
  }

  public getDisplayMethod(): string {
    switch (this.method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return this.details.cardType 
          ? `${this.details.cardType.toUpperCase()} ****${this.details.lastFourDigits || ''}` 
          : 'Card';
      case 'check':
        return this.details.checkNumber 
          ? `Check #${this.details.checkNumber}` 
          : 'Check';
      case 'transfer':
        return 'Bank Transfer';
      case 'crypto':
        return this.details.cryptoCurrency 
          ? `${this.details.cryptoCurrency} Crypto` 
          : 'Cryptocurrency';
      case 'layaway':
        return 'Layaway';
      case 'trade-in':
        return 'Trade-in';
      case 'store-credit':
        return 'Store Credit';
      default:
        return this.method;
    }
  }

  public getFormattedAmount(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    });
    return formatter.format(this.amount);
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      receiptId: this.receiptId,
      quotationId: this.quotationId,
      clientId: this.clientId,
      method: this.method,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      details: this.details,
      reference: this.reference,
      notes: this.notes,
      processedAt: this.processedAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}