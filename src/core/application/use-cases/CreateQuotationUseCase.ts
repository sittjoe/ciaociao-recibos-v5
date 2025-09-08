import { Quotation, QuotationItem } from '../../domain/entities/Quotation.js';
import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository.js';
import { IClientRepository } from '../../domain/repositories/IClientRepository.js';
import { EventBus, createQuotationCreatedEvent } from '../../infrastructure/events/index.js';
import { BaseUseCase, NotFoundError } from './base/UseCase.js';
import { Injectable, Inject } from '../../infrastructure/di/index.js';

export interface CreateQuotationRequest {
  clientId: string;
  title: string;
  description?: string;
  items: Omit<QuotationItem, 'id'>[];
  validityDays?: number;
  notes?: string;
}

export interface CreateQuotationResponse {
  quotation: Quotation;
  quotationNumber: string;
}

@Injectable()
export class CreateQuotationUseCase extends BaseUseCase<
  CreateQuotationRequest,
  CreateQuotationResponse
> {
  constructor(
    @Inject('IQuotationRepository') private quotationRepository: IQuotationRepository,
    @Inject('IClientRepository') private clientRepository: IClientRepository,
    @Inject(EventBus) private eventBus: EventBus
  ) {
    super();
  }

  async validate(request: CreateQuotationRequest): Promise<string[]> {
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

    // Validate basic fields
    if (!request.title?.trim()) {
      errors.push('Title is required');
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

    // Validate validity days
    if (request.validityDays !== undefined && request.validityDays <= 0) {
      errors.push('Validity days must be greater than 0');
    }

    return errors;
  }

  async execute(request: CreateQuotationRequest): Promise<CreateQuotationResponse> {
    // Get next quotation number
    const quotationNumber = await this.quotationRepository.getNextQuotationNumber();

    // Create quotation
    const quotation = new Quotation(
      quotationNumber,
      request.clientId,
      request.title,
      request.validityDays || 30
    );

    // Set description if provided
    if (request.description) {
      quotation.description = request.description;
    }

    // Add items to quotation
    for (const itemData of request.items) {
      const item: QuotationItem = {
        id: crypto.randomUUID(),
        productId: itemData.productId,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        totalPrice: itemData.quantity * itemData.unitPrice,
        weight: itemData.weight,
        material: itemData.material,
        karat: itemData.karat,
        laborCost: itemData.laborCost,
        materialCost: itemData.materialCost,
      };
      quotation.addItem(item);
    }

    // Add notes if provided
    if (request.notes) {
      quotation.notes = request.notes;
    }

    // Save quotation
    const savedQuotation = await this.quotationRepository.save(quotation);

    // Publish event
    await this.eventBus.publish(
      createQuotationCreatedEvent(savedQuotation.id, {
        quotationId: savedQuotation.id,
        clientId: savedQuotation.clientId,
        amount: savedQuotation.total,
      })
    );

    return {
      quotation: savedQuotation,
      quotationNumber: savedQuotation.quotationNumber,
    };
  }
}
