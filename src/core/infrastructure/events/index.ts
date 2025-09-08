export * from './types.js';
export { EventBus } from './EventBus.js';
export * from './handlers/index.js';

// Event factory functions for easy creation
import { v4 as uuidv4 } from 'uuid';
import {
  ReceiptCreatedEvent,
  ReceiptCompletedEvent,
  QuotationCreatedEvent,
  QuotationAcceptedEvent,
  PaymentProcessedEvent,
  ClientRegisteredEvent,
  ProductStockLowEvent,
} from './types.js';

export const createReceiptCreatedEvent = (
  aggregateId: string,
  data: { receiptId: string; clientId: string; amount: number }
): ReceiptCreatedEvent => ({
  id: uuidv4(),
  type: 'receipt.created',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createReceiptCompletedEvent = (
  aggregateId: string,
  data: { receiptId: string; clientId: string; amount: number; completedAt: Date }
): ReceiptCompletedEvent => ({
  id: uuidv4(),
  type: 'receipt.completed',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createQuotationCreatedEvent = (
  aggregateId: string,
  data: { quotationId: string; clientId: string; amount: number }
): QuotationCreatedEvent => ({
  id: uuidv4(),
  type: 'quotation.created',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createQuotationAcceptedEvent = (
  aggregateId: string,
  data: { quotationId: string; clientId: string; amount: number; acceptedAt: Date }
): QuotationAcceptedEvent => ({
  id: uuidv4(),
  type: 'quotation.accepted',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createPaymentProcessedEvent = (
  aggregateId: string,
  data: { paymentId: string; receiptId: string; amount: number; method: string }
): PaymentProcessedEvent => ({
  id: uuidv4(),
  type: 'payment.processed',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createClientRegisteredEvent = (
  aggregateId: string,
  data: { clientId: string; email: string; name: string }
): ClientRegisteredEvent => ({
  id: uuidv4(),
  type: 'client.registered',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});

export const createProductStockLowEvent = (
  aggregateId: string,
  data: { productId: string; currentStock: number; threshold: number }
): ProductStockLowEvent => ({
  id: uuidv4(),
  type: 'product.stock.low',
  occurredAt: new Date(),
  aggregateId,
  version: 1,
  data,
});
