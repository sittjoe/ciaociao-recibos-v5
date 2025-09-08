import { v4 as uuidv4 } from 'uuid';
import {
  DomainEvent,
  EventHandler,
  EventSubscription,
  EventHandlerFunction,
  EventBusOptions,
} from './types.js';
import { Injectable, Singleton } from '../di/index.js';

@Singleton()
export class EventBus {
  private subscriptions = new Map<string, Map<string, EventSubscription>>();
  private eventQueue: Array<{ event: DomainEvent; retryCount: number }> = [];
  private processing = false;
  private options: Required<EventBusOptions>;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: false,
      errorHandler: (error, event) => {
        console.error(`Event handling failed for ${event.type}:`, error);
      },
      ...options,
    };
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T> | EventHandlerFunction<T>
  ): EventSubscription {
    const subscriptionId = uuidv4();
    const eventHandlerWrapper = typeof handler === 'function' ? { handle: handler } : handler;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: eventHandlerWrapper,
      unsubscribe: () => this.unsubscribe(eventType, subscriptionId),
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Map());
    }

    this.subscriptions.get(eventType)!.set(subscriptionId, subscription);

    if (this.options.enableLogging) {
      console.log(`Subscribed to event: ${eventType}`);
    }

    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, subscriptionId: string): void {
    const typeSubscriptions = this.subscriptions.get(eventType);
    if (typeSubscriptions) {
      typeSubscriptions.delete(subscriptionId);
      
      if (typeSubscriptions.size === 0) {
        this.subscriptions.delete(eventType);
      }
      
      if (this.options.enableLogging) {
        console.log(`Unsubscribed from event: ${eventType}`);
      }
    }
  }

  /**
   * Publish an event asynchronously
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    if (this.options.enableLogging) {
      console.log(`Publishing event: ${event.type}`, event);
    }

    this.eventQueue.push({ event, retryCount: 0 });
    
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Publish an event synchronously (for testing or immediate processing)
   */
  async publishSync<T extends DomainEvent>(event: T): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type);
    if (!subscriptions || subscriptions.size === 0) {
      return;
    }

    const promises = Array.from(subscriptions.values()).map(subscription =>
      this.executeHandler(subscription.handler, event)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get all subscribers for an event type
   */
  getSubscribers(eventType: string): EventSubscription[] {
    const typeSubscriptions = this.subscriptions.get(eventType);
    return typeSubscriptions ? Array.from(typeSubscriptions.values()) : [];
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.eventQueue = [];
  }

  /**
   * Get event statistics
   */
  getStats(): {
    subscriptionCount: number;
    eventTypeCount: number;
    queueSize: number;
    eventTypes: string[];
  } {
    let subscriptionCount = 0;
    const eventTypes: string[] = [];

    for (const [eventType, subs] of this.subscriptions.entries()) {
      eventTypes.push(eventType);
      subscriptionCount += subs.size;
    }

    return {
      subscriptionCount,
      eventTypeCount: this.subscriptions.size,
      queueSize: this.eventQueue.length,
      eventTypes,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const item = this.eventQueue.shift();
        if (!item) continue;

        try {
          await this.publishSync(item.event);
        } catch (error) {
          await this.handleEventError(error as Error, item);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeHandler(handler: EventHandler, event: DomainEvent): Promise<void> {
    try {
      const result = handler.handle(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      this.options.errorHandler(error as Error, event);
      throw error;
    }
  }

  private async handleEventError(
    error: Error,
    item: { event: DomainEvent; retryCount: number }
  ): Promise<void> {
    if (item.retryCount < this.options.maxRetries) {
      item.retryCount++;
      
      if (this.options.enableLogging) {
        console.log(
          `Retrying event ${item.event.type} (attempt ${item.retryCount}/${this.options.maxRetries})`
        );
      }
      
      // Add delay before retry
      await new Promise(resolve => 
        setTimeout(resolve, this.options.retryDelay * item.retryCount)
      );
      
      this.eventQueue.unshift(item);
    } else {
      this.options.errorHandler(error, item.event);
      
      if (this.options.enableLogging) {
        console.error(
          `Failed to process event ${item.event.type} after ${this.options.maxRetries} retries:`,
          error
        );
      }
    }
  }
}
