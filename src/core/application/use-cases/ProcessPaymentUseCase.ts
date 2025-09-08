import { ReceiptPayment } from '../../domain/entities/Receipt.js';
import { IReceiptRepository } from '../../domain/repositories/IReceiptRepository.js';
import { EventBus, createPaymentProcessedEvent, createReceiptCompletedEvent } from '../../infrastructure/events/index.js';
import { BaseUseCase, NotFoundError, ValidationError } from './base/UseCase.js';
import { Injectable, Inject } from '../../infrastructure/di/index.js';

export interface ProcessPaymentRequest {
  receiptId: string;
  amount: number;
  method: 'cash' | 'card' | 'check' | 'transfer' | 'partial';
  reference?: string;
  notes?: string;
}

export interface ProcessPaymentResponse {
  paymentId: string;
  remainingBalance: number;
  isFullyPaid: boolean;
  receiptCompleted: boolean;
}

@Injectable()
export class ProcessPaymentUseCase extends BaseUseCase<
  ProcessPaymentRequest,
  ProcessPaymentResponse
> {
  constructor(
    @Inject('IReceiptRepository') private receiptRepository: IReceiptRepository,
    @Inject(EventBus) private eventBus: EventBus
  ) {
    super();
  }

  async validate(request: ProcessPaymentRequest): Promise<string[]> {
    const errors: string[] = [];

    // Validate receipt exists
    if (!request.receiptId) {
      errors.push('Receipt ID is required');
      return errors;
    }

    const receipt = await this.receiptRepository.findById(request.receiptId);
    if (!receipt) {
      errors.push('Receipt not found');
      return errors;
    }

    // Validate receipt status
    if (receipt.status === 'completed') {
      errors.push('Cannot add payment to completed receipt');
    }
    if (receipt.status === 'cancelled') {
      errors.push('Cannot add payment to cancelled receipt');
    }
    if (receipt.status === 'refunded') {
      errors.push('Cannot add payment to refunded receipt');
    }

    // Validate payment amount
    if (request.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    const remainingBalance = receipt.getRemainingBalance();
    if (request.amount > remainingBalance) {
      errors.push(
        `Payment amount (${request.amount}) exceeds remaining balance (${remainingBalance})`
      );
    }

    // Validate payment method
    const validMethods = ['cash', 'card', 'check', 'transfer', 'partial'];
    if (!validMethods.includes(request.method)) {
      errors.push('Invalid payment method');
    }

    return errors;
  }

  async execute(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    // Get receipt
    const receipt = await this.receiptRepository.findById(request.receiptId);
    if (!receipt) {
      throw new NotFoundError('Receipt', request.receiptId);
    }

    // Create payment
    const payment: ReceiptPayment = {
      id: crypto.randomUUID(),
      method: request.method,
      amount: request.amount,
      date: new Date(),
      reference: request.reference,
      notes: request.notes,
    };

    // Add payment to receipt
    receipt.addPayment(payment);

    // Check if receipt is now fully paid
    let receiptCompleted = false;
    if (receipt.isFullyPaid() && receipt.status === 'draft') {
      receipt.markAsCompleted();
      receiptCompleted = true;
    }

    // Save updated receipt
    await this.receiptRepository.save(receipt);

    // Publish payment processed event
    await this.eventBus.publish(
      createPaymentProcessedEvent(receipt.id, {
        paymentId: payment.id,
        receiptId: receipt.id,
        amount: payment.amount,
        method: payment.method,
      })
    );

    // Publish receipt completed event if applicable
    if (receiptCompleted) {
      await this.eventBus.publish(
        createReceiptCompletedEvent(receipt.id, {
          receiptId: receipt.id,
          clientId: receipt.clientId,
          amount: receipt.total,
          completedAt: receipt.completedAt!,
        })
      );
    }

    return {
      paymentId: payment.id,
      remainingBalance: receipt.getRemainingBalance(),
      isFullyPaid: receipt.isFullyPaid(),
      receiptCompleted,
    };
  }
}
