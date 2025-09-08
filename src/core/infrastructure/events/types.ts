export interface DomainEvent {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly version: number;
  readonly data?: Record<string, unknown>;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void> | void;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  unsubscribe(): void;
}

export type EventHandlerFunction<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void;

export interface EventBusOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  errorHandler?: (error: Error, event: DomainEvent) => void;
}

// Business domain events
export interface ReceiptCreatedEvent extends DomainEvent {
  type: 'receipt.created';
  data: {
    receiptId: string;
    clientId: string;
    amount: number;
  };
}

export interface ReceiptCompletedEvent extends DomainEvent {
  type: 'receipt.completed';
  data: {
    receiptId: string;
    clientId: string;
    amount: number;
    completedAt: Date;
  };
}

export interface QuotationCreatedEvent extends DomainEvent {
  type: 'quotation.created';
  data: {
    quotationId: string;
    clientId: string;
    amount: number;
  };
}

export interface QuotationAcceptedEvent extends DomainEvent {
  type: 'quotation.accepted';
  data: {
    quotationId: string;
    clientId: string;
    amount: number;
    acceptedAt: Date;
  };
}

export interface PaymentProcessedEvent extends DomainEvent {
  type: 'payment.processed';
  data: {
    paymentId: string;
    receiptId: string;
    amount: number;
    method: string;
  };
}

export interface ClientRegisteredEvent extends DomainEvent {
  type: 'client.registered';
  data: {
    clientId: string;
    email: string;
    name: string;
  };
}

export interface ProductStockLowEvent extends DomainEvent {
  type: 'product.stock.low';
  data: {
    productId: string;
    currentStock: number;
    threshold: number;
  };
}

// Union type for all domain events
export type BusinessEvent =
  | ReceiptCreatedEvent
  | ReceiptCompletedEvent
  | QuotationCreatedEvent
  | QuotationAcceptedEvent
  | PaymentProcessedEvent
  | ClientRegisteredEvent
  | ProductStockLowEvent;
