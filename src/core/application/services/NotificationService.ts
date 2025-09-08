import { Injectable } from '../../infrastructure/di/index.js';
import { EventBus } from '../../infrastructure/events/index.js';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
  userId?: string;
  data?: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: NotificationType;
  variables: string[];
}

@Injectable()
export class NotificationService {
  private notifications: Notification[] = [];
  private subscribers = new Map<string, (notification: Notification) => void>();
  private templates: NotificationTemplate[] = [
    {
      id: 'receipt-created',
      name: 'Receipt Created',
      title: 'Receipt Created',
      message: 'Receipt #{receiptNumber} has been created for {clientName}',
      type: 'success',
      variables: ['receiptNumber', 'clientName'],
    },
    {
      id: 'payment-received',
      name: 'Payment Received',
      title: 'Payment Received',
      message: 'Payment of ${amount} received for receipt #{receiptNumber}',
      type: 'success',
      variables: ['amount', 'receiptNumber'],
    },
    {
      id: 'quotation-accepted',
      name: 'Quotation Accepted',
      title: 'Quotation Accepted',
      message: 'Quotation #{quotationNumber} has been accepted by {clientName}',
      type: 'success',
      variables: ['quotationNumber', 'clientName'],
    },
    {
      id: 'low-stock-alert',
      name: 'Low Stock Alert',
      title: 'Low Stock Alert',
      message: 'Product {productName} is running low (current stock: {currentStock})',
      type: 'warning',
      variables: ['productName', 'currentStock'],
    },
    {
      id: 'quotation-expired',
      name: 'Quotation Expired',
      title: 'Quotation Expired',
      message: 'Quotation #{quotationNumber} has expired',
      type: 'warning',
      variables: ['quotationNumber'],
    },
    {
      id: 'system-error',
      name: 'System Error',
      title: 'System Error',
      message: 'An error occurred: {errorMessage}',
      type: 'error',
      variables: ['errorMessage'],
    },
  ];

  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  /**
   * Send a notification
   */
  send(
    type: NotificationType,
    title: string,
    message: string,
    options: {
      persistent?: boolean;
      userId?: string;
      data?: Record<string, unknown>;
    } = {}
  ): string {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      persistent: options.persistent || false,
      userId: options.userId,
      data: options.data,
    };

    this.notifications.push(notification);
    this.notifySubscribers(notification);
    
    return notification.id;
  }

  /**
   * Send notification from template
   */
  sendFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    options: {
      persistent?: boolean;
      userId?: string;
      data?: Record<string, unknown>;
    } = {}
  ): string | null {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      console.warn(`Notification template not found: ${templateId}`);
      return null;
    }

    const title = this.processTemplate(template.title, variables);
    const message = this.processTemplate(template.message, variables);

    return this.send(template.type, title, message, options);
  }

  /**
   * Send success notification
   */
  success(title: string, message: string, options?: { persistent?: boolean; userId?: string }): string {
    return this.send('success', title, message, options);
  }

  /**
   * Send error notification
   */
  error(title: string, message: string, options?: { persistent?: boolean; userId?: string }): string {
    return this.send('error', title, message, options);
  }

  /**
   * Send warning notification
   */
  warning(title: string, message: string, options?: { persistent?: boolean; userId?: string }): string {
    return this.send('warning', title, message, options);
  }

  /**
   * Send info notification
   */
  info(title: string, message: string, options?: { persistent?: boolean; userId?: string }): string {
    return this.send('info', title, message, options);
  }

  /**
   * Get all notifications for a user
   */
  getNotifications(userId?: string): Notification[] {
    return this.notifications
      .filter(n => !userId || !n.userId || n.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unread notifications for a user
   */
  getUnreadNotifications(userId?: string): Notification[] {
    return this.getNotifications(userId).filter(n => !n.read);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId?: string): number {
    let markedCount = 0;
    this.notifications
      .filter(n => !n.read && (!userId || !n.userId || n.userId === userId))
      .forEach(n => {
        n.read = true;
        markedCount++;
      });
    return markedCount;
  }

  /**
   * Delete notification
   */
  delete(notificationId: string): boolean {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index >= 0) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear old notifications (non-persistent)
   */
  clearOldNotifications(olderThanDays: number = 7): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(
      n => n.persistent || n.timestamp > cutoffDate
    );
    
    return initialCount - this.notifications.length;
  }

  /**
   * Subscribe to notifications
   */
  subscribe(subscriberId: string, callback: (notification: Notification) => void): void {
    this.subscribers.set(subscriberId, callback);
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  /**
   * Get notification statistics
   */
  getStats(userId?: string): {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
  } {
    const notifications = this.getNotifications(userId);
    const unread = notifications.filter(n => !n.read);
    
    const byType: Record<NotificationType, number> = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0,
    };
    
    notifications.forEach(n => {
      byType[n.type]++;
    });

    return {
      total: notifications.length,
      unread: unread.length,
      byType,
    };
  }

  /**
   * Add or update notification template
   */
  addTemplate(template: Omit<NotificationTemplate, 'id'> & { id?: string }): string {
    const templateId = template.id || crypto.randomUUID();
    const existingIndex = this.templates.findIndex(t => t.id === templateId);
    
    const fullTemplate: NotificationTemplate = {
      ...template,
      id: templateId,
    };
    
    if (existingIndex >= 0) {
      this.templates[existingIndex] = fullTemplate;
    } else {
      this.templates.push(fullTemplate);
    }
    
    return templateId;
  }

  /**
   * Get all notification templates
   */
  getTemplates(): NotificationTemplate[] {
    return [...this.templates];
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return processed;
  }

  private notifySubscribers(notification: Notification): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
  }

  private setupEventListeners(): void {
    // Listen to business events and send notifications
    this.eventBus.subscribe('receipt.created', async (event) => {
      this.sendFromTemplate('receipt-created', {
        receiptNumber: event.data.receiptId,
        clientName: 'Client', // Would need to fetch client name
      });
    });

    this.eventBus.subscribe('payment.processed', async (event) => {
      this.sendFromTemplate('payment-received', {
        amount: event.data.amount.toString(),
        receiptNumber: event.data.receiptId,
      });
    });

    this.eventBus.subscribe('quotation.accepted', async (event) => {
      this.sendFromTemplate('quotation-accepted', {
        quotationNumber: event.data.quotationId,
        clientName: 'Client', // Would need to fetch client name
      });
    });

    this.eventBus.subscribe('product.stock.low', async (event) => {
      this.sendFromTemplate('low-stock-alert', {
        productName: event.data.productId, // Would need to fetch product name
        currentStock: event.data.currentStock.toString(),
      });
    });
  }
}
