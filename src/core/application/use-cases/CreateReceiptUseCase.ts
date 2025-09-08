import { Receipt, ReceiptItem } from '../../domain/entities/Receipt.js';
import { IReceiptRepository } from '../../domain/repositories/IReceiptRepository.js';
import { IClientRepository } from '../../domain/repositories/IClientRepository.js';
import { EventBus, createReceiptCreatedEvent } from '../../infrastructure/events/index.js';
import { BaseUseCase, NotFoundError, ValidationError } from './base/UseCase.js';
import { Injectable, Inject } from '../../infrastructure/di/index.js';

export interface CreateReceiptRequest {
  clientId: string;
  items: Omit<ReceiptItem, 'id'>[];
  notes?: string;
  taxRate?: number;
  taxLabel?: string;
}

export interface CreateReceiptResponse {
  receipt: Receipt;
  receiptNumber: string;
}

@Injectable()
export class CreateReceiptUseCase extends BaseUseCase<CreateReceiptRequest, CreateReceiptResponse> {
  constructor(
    @Inject('IReceiptRepository') private receiptRepository: IReceiptRepository,
    @Inject('IClientRepository') private clientRepository: IClientRepository,
    @Inject(EventBus) private eventBus: EventBus
  ) {
    super();
  }

  async validate(request: CreateReceiptRequest): Promise<string[]> {
    const errors: string[] = [];

    // Validate client exists
    if (!request.clientId) {
      errors.push('Client ID is required');
    } else {
      const clientExists = await this.clientRepository.exists(request.clientId);
      if (!clientExists) {
        errors.push('Client not found');
      }
    }

    // Validate items
    if (!request.items || request.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      request.items.forEach((item, index) => {
        if (!item.description?.trim()) {
          errors.push(`Item ${index + 1}: Description is required`);
        }
        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        }
      });
    }

    // Validate tax rate
    if (request.taxRate !== undefined && (request.taxRate < 0 || request.taxRate > 1)) {
      errors.push('Tax rate must be between 0 and 1');
    }

    return errors;
  }

  async execute(request: CreateReceiptRequest): Promise<CreateReceiptResponse> {
    // Get next receipt number
    const receiptNumber = await this.receiptRepository.getNextReceiptNumber();

    // Create receipt with tax configuration
    const taxConfig = {
      label: request.taxLabel || 'Sales Tax',
      rate: request.taxRate || 0.08,
      amount: 0,
    };

    const receipt = new Receipt(request.clientId, receiptNumber, [], taxConfig);

    // Add items to receipt
    for (const itemData of request.items) {
      const item: ReceiptItem = {
        id: crypto.randomUUID(),
        productId: itemData.productId || '',
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        totalPrice: itemData.quantity * itemData.unitPrice,
        weight: itemData.weight,
        material: itemData.material,
        karat: itemData.karat,
      };
      receipt.addItem(item);
    }

    // Add notes if provided
    if (request.notes) {
      receipt.notes = request.notes;
    }

    // Save receipt
    const savedReceipt = await this.receiptRepository.save(receipt);

    // Publish event
    await this.eventBus.publish(
      createReceiptCreatedEvent(savedReceipt.id, {
        receiptId: savedReceipt.id,
        clientId: savedReceipt.clientId,
        amount: savedReceipt.total,
      })
    );

    return {
      receipt: savedReceipt,
      receiptNumber: savedReceipt.receiptNumber,
    };
  }
}
