import { v4 as uuidv4 } from 'uuid';

export interface ReceiptItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  material?: string;
  karat?: number;
}

export interface ReceiptPayment {
  id: string;
  method: 'cash' | 'card' | 'check' | 'transfer' | 'partial';
  amount: number;
  date: Date;
  reference?: string;
  notes?: string;
}

export interface ReceiptTax {
  label: string;
  rate: number;
  amount: number;
}

export class Receipt {
  public readonly id: string;
  public receiptNumber: string;
  public clientId: string;
  public items: ReceiptItem[];
  public payments: ReceiptPayment[];
  public tax: ReceiptTax;
  public subtotal: number;
  public total: number;
  public status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  public notes?: string;
  public createdAt: Date;
  public updatedAt: Date;
  public completedAt?: Date;

  constructor(
    receiptNumber: string,
    clientId: string,
    items: ReceiptItem[] = [],
    tax: ReceiptTax = { label: 'Sales Tax', rate: 0.08, amount: 0 }
  ) {
    this.id = uuidv4();
    this.receiptNumber = receiptNumber;
    this.clientId = clientId;
    this.items = items;
    this.payments = [];
    this.tax = tax;
    this.subtotal = 0;
    this.total = 0;
    this.status = 'draft';
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.calculateTotals();
  }

  public addItem(item: ReceiptItem): void {
    this.items.push(item);
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public removeItem(itemId: string): void {
    this.items = this.items.filter(item => item.id !== itemId);
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  public updateItem(itemId: string, updates: Partial<ReceiptItem>): void {
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

  public addPayment(payment: ReceiptPayment): void {
    this.payments.push(payment);
    this.updatedAt = new Date();
  }

  public removePayment(paymentId: string): void {
    this.payments = this.payments.filter(payment => payment.id !== paymentId);
    this.updatedAt = new Date();
  }

  public getTotalPaid(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  public getRemainingBalance(): number {
    return this.total - this.getTotalPaid();
  }

  public isFullyPaid(): boolean {
    return this.getRemainingBalance() <= 0;
  }

  public markAsCompleted(): void {
    if (this.isFullyPaid()) {
      this.status = 'completed';
      this.completedAt = new Date();
      this.updatedAt = new Date();
    } else {
      throw new Error('Cannot complete receipt with outstanding balance');
    }
  }

  public cancel(): void {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  public refund(): void {
    this.status = 'refunded';
    this.updatedAt = new Date();
  }

  private calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.tax.amount = this.subtotal * this.tax.rate;
    this.total = this.subtotal + this.tax.amount;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      receiptNumber: this.receiptNumber,
      clientId: this.clientId,
      items: this.items,
      payments: this.payments,
      tax: this.tax,
      subtotal: this.subtotal,
      total: this.total,
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
    };
  }
}