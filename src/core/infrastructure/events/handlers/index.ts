import { EventHandler } from '../types.js';
import {
  ReceiptCreatedEvent,
  ReceiptCompletedEvent,
  QuotationAcceptedEvent,
  ClientRegisteredEvent,
  ProductStockLowEvent,
  PaymentProcessedEvent,
} from '../types.js';
import { Injectable } from '../../di/index.js';

@Injectable()
export class ReceiptCreatedHandler implements EventHandler<ReceiptCreatedEvent> {
  async handle(event: ReceiptCreatedEvent): Promise<void> {
    // Log receipt creation
    console.log(`Receipt created: ${event.data.receiptId} for client ${event.data.clientId}`);
    
    // Could trigger:
    // - Email notification to client
    // - Update customer history
    // - Analytics tracking
    // - Inventory updates
  }
}

@Injectable()
export class ReceiptCompletedHandler implements EventHandler<ReceiptCompletedEvent> {
  async handle(event: ReceiptCompletedEvent): Promise<void> {
    // Handle receipt completion
    console.log(`Receipt completed: ${event.data.receiptId}`);
    
    // Could trigger:
    // - Generate PDF receipt
    // - Send completion notification
    // - Update financial reports
    // - Trigger loyalty program updates
  }
}

@Injectable()
export class QuotationAcceptedHandler implements EventHandler<QuotationAcceptedEvent> {
  async handle(event: QuotationAcceptedEvent): Promise<void> {
    // Handle quotation acceptance
    console.log(`Quotation accepted: ${event.data.quotationId}`);
    
    // Could trigger:
    // - Auto-create receipt from quotation
    // - Send acceptance confirmation
    // - Schedule follow-up tasks
    // - Update sales pipeline
  }
}

@Injectable()
export class PaymentProcessedHandler implements EventHandler<PaymentProcessedEvent> {
  async handle(event: PaymentProcessedEvent): Promise<void> {
    // Handle payment processing
    console.log(
      `Payment processed: ${event.data.paymentId} for receipt ${event.data.receiptId}`
    );
    
    // Could trigger:
    // - Update receipt status
    // - Send payment confirmation
    // - Update accounting records
    // - Trigger automated workflows
  }
}

@Injectable()
export class ClientRegisteredHandler implements EventHandler<ClientRegisteredEvent> {
  async handle(event: ClientRegisteredEvent): Promise<void> {
    // Handle client registration
    console.log(`Client registered: ${event.data.clientId}`);
    
    // Could trigger:
    // - Send welcome email
    // - Create customer profile
    // - Add to mailing list
    // - Setup preferences
  }
}

@Injectable()
export class ProductStockLowHandler implements EventHandler<ProductStockLowEvent> {
  async handle(event: ProductStockLowEvent): Promise<void> {
    // Handle low stock alert
    console.log(`Low stock alert: Product ${event.data.productId}`);
    
    // Could trigger:
    // - Send low stock notification
    // - Auto-create purchase order
    // - Update inventory reports
    // - Notify suppliers
  }
}

// Export all handlers for easy registration
export const eventHandlers = [
  ReceiptCreatedHandler,
  ReceiptCompletedHandler,
  QuotationAcceptedHandler,
  PaymentProcessedHandler,
  ClientRegisteredHandler,
  ProductStockLowHandler,
];
