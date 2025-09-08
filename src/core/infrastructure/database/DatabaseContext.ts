import Dexie, { Table } from 'dexie';
import { Receipt } from '../../domain/entities/Receipt.js';
import { Quotation } from '../../domain/entities/Quotation.js';
import { Product } from '../../domain/entities/Product.js';
import { Client } from '../../domain/entities/Client.js';
import { Payment } from '../../domain/entities/Payment.js';
import { Injectable } from '../di/index.js';

export interface DatabaseMigration {
  version: number;
  description: string;
  up: (db: DatabaseContext) => Promise<void>;
  down: (db: DatabaseContext) => Promise<void>;
}

export interface DatabaseBackup {
  version: string;
  timestamp: Date;
  data: {
    receipts: any[];
    quotations: any[];
    products: any[];
    clients: any[];
    payments: any[];
    settings: any[];
  };
}

@Injectable()
export class DatabaseContext extends Dexie {
  // Tables
  receipts!: Table<Receipt, string>;
  quotations!: Table<Quotation, string>;
  products!: Table<Product, string>;
  clients!: Table<Client, string>;
  payments!: Table<Payment, string>;
  settings!: Table<{ key: string; value: any }, string>;
  migrations!: Table<{ version: number; appliedAt: Date }, number>;

  constructor() {
    super('CiaoCiaoJewelryDB');
    this.defineSchema();
    this.setupHooks();
  }

  private defineSchema(): void {
    // Version 1: Initial schema
    this.version(1).stores({
      receipts: 'id, receiptNumber, clientId, status, createdAt, updatedAt, total',
      quotations: 'id, quotationNumber, clientId, status, createdAt, updatedAt, validUntil, total',
      products: 'id, sku, name, category, isActive, stockQuantity, createdAt, updatedAt',
      clients: 'id, email, firstName, lastName, phone, isActive, createdAt, updatedAt',
      payments: 'id, receiptId, amount, method, status, createdAt, updatedAt',
      settings: 'key',
      migrations: 'version',
    });

    // Version 2: Add indexes
    this.version(2).stores({
      receipts: 'id, receiptNumber, clientId, status, createdAt, updatedAt, total, completedAt',
      quotations: 'id, quotationNumber, clientId, status, createdAt, updatedAt, validUntil, total, convertedReceiptId',
      products: 'id, sku, name, category, isActive, stockQuantity, createdAt, updatedAt, *tags',
      clients: 'id, email, firstName, lastName, phone, isActive, createdAt, updatedAt, *tags',
      payments: 'id, receiptId, amount, method, status, createdAt, updatedAt, processedAt',
      settings: 'key',
      migrations: 'version',
    });

    // Version 3: Add full-text search indexes
    this.version(3).stores({
      receipts: 'id, receiptNumber, clientId, status, createdAt, updatedAt, total, completedAt, *searchTerms',
      quotations: 'id, quotationNumber, clientId, status, createdAt, updatedAt, validUntil, total, convertedReceiptId, *searchTerms',
      products: 'id, sku, name, category, isActive, stockQuantity, createdAt, updatedAt, *tags, *searchTerms',
      clients: 'id, email, firstName, lastName, phone, isActive, createdAt, updatedAt, *tags, *searchTerms',
      payments: 'id, receiptId, amount, method, status, createdAt, updatedAt, processedAt',
      settings: 'key',
      migrations: 'version',
    });
  }

  private setupHooks(): void {
    // Add search terms before storing
    this.receipts.hook('creating', (primKey, obj, trans) => {
      this.addSearchTerms(obj, ['receiptNumber', 'notes']);
    });

    this.receipts.hook('updating', (modifications, primKey, obj, trans) => {
      if (obj) {
        this.addSearchTerms(obj, ['receiptNumber', 'notes']);
      }
    });

    this.quotations.hook('creating', (primKey, obj, trans) => {
      this.addSearchTerms(obj, ['quotationNumber', 'title', 'description', 'notes']);
    });

    this.quotations.hook('updating', (modifications, primKey, obj, trans) => {
      if (obj) {
        this.addSearchTerms(obj, ['quotationNumber', 'title', 'description', 'notes']);
      }
    });

    this.products.hook('creating', (primKey, obj, trans) => {
      this.addSearchTerms(obj, ['sku', 'name', 'description', 'notes']);
    });

    this.products.hook('updating', (modifications, primKey, obj, trans) => {
      if (obj) {
        this.addSearchTerms(obj, ['sku', 'name', 'description', 'notes']);
      }
    });

    this.clients.hook('creating', (primKey, obj, trans) => {
      this.addSearchTerms(obj, ['firstName', 'lastName', 'email', 'phone', 'notes']);
    });

    this.clients.hook('updating', (modifications, primKey, obj, trans) => {
      if (obj) {
        this.addSearchTerms(obj, ['firstName', 'lastName', 'email', 'phone', 'notes']);
      }
    });
  }

  /**
   * Run database migrations
   */
  async runMigrations(migrations: DatabaseMigration[]): Promise<void> {
    const appliedMigrations = await this.migrations.orderBy('version').toArray();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    for (const migration of migrations.sort((a, b) => a.version - b.version)) {
      if (!appliedVersions.has(migration.version)) {
        try {
          await migration.up(this);
          await this.migrations.add({
            version: migration.version,
            appliedAt: new Date(),
          });
          console.log(`Applied migration ${migration.version}: ${migration.description}`);
        } catch (error) {
          console.error(`Failed to apply migration ${migration.version}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Create database backup
   */
  async createBackup(): Promise<DatabaseBackup> {
    const [receipts, quotations, products, clients, payments, settings] = await Promise.all([
      this.receipts.toArray(),
      this.quotations.toArray(),
      this.products.toArray(),
      this.clients.toArray(),
      this.payments.toArray(),
      this.settings.toArray(),
    ]);

    return {
      version: '1.0.0',
      timestamp: new Date(),
      data: {
        receipts: receipts.map(r => this.serializeEntity(r)),
        quotations: quotations.map(q => this.serializeEntity(q)),
        products: products.map(p => this.serializeEntity(p)),
        clients: clients.map(c => this.serializeEntity(c)),
        payments: payments.map(p => this.serializeEntity(p)),
        settings,
      },
    };
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backup: DatabaseBackup): Promise<void> {
    await this.transaction('rw', [this.receipts, this.quotations, this.products, this.clients, this.payments, this.settings], async () => {
      // Clear existing data
      await Promise.all([
        this.receipts.clear(),
        this.quotations.clear(),
        this.products.clear(),
        this.clients.clear(),
        this.payments.clear(),
        this.settings.clear(),
      ]);

      // Restore data
      await Promise.all([
        this.receipts.bulkAdd(backup.data.receipts.map(r => this.deserializeEntity(r, 'receipt'))),
        this.quotations.bulkAdd(backup.data.quotations.map(q => this.deserializeEntity(q, 'quotation'))),
        this.products.bulkAdd(backup.data.products.map(p => this.deserializeEntity(p, 'product'))),
        this.clients.bulkAdd(backup.data.clients.map(c => this.deserializeEntity(c, 'client'))),
        this.payments.bulkAdd(backup.data.payments.map(p => this.deserializeEntity(p, 'payment'))),
        this.settings.bulkAdd(backup.data.settings),
      ]);
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    receipts: number;
    quotations: number;
    products: number;
    clients: number;
    payments: number;
    databaseSize: number;
  }> {
    const [receipts, quotations, products, clients, payments] = await Promise.all([
      this.receipts.count(),
      this.quotations.count(),
      this.products.count(),
      this.clients.count(),
      this.payments.count(),
    ]);

    // Estimate database size (not exact, but gives an idea)
    const databaseSize = await this.estimateSize();

    return {
      receipts,
      quotations,
      products,
      clients,
      payments,
      databaseSize,
    };
  }

  /**
   * Optimize database (rebuild indexes, clean up)
   */
  async optimize(): Promise<void> {
    // IndexedDB doesn't have a built-in optimize command,
    // but we can perform maintenance tasks
    await this.transaction('rw', [this.receipts, this.quotations, this.products, this.clients], async () => {
      // Rebuild search terms for all entities
      const receipts = await this.receipts.toArray();
      const quotations = await this.quotations.toArray();
      const products = await this.products.toArray();
      const clients = await this.clients.toArray();

      await Promise.all([
        ...receipts.map(r => {
          this.addSearchTerms(r, ['receiptNumber', 'notes']);
          return this.receipts.put(r);
        }),
        ...quotations.map(q => {
          this.addSearchTerms(q, ['quotationNumber', 'title', 'description', 'notes']);
          return this.quotations.put(q);
        }),
        ...products.map(p => {
          this.addSearchTerms(p, ['sku', 'name', 'description', 'notes']);
          return this.products.put(p);
        }),
        ...clients.map(c => {
          this.addSearchTerms(c, ['firstName', 'lastName', 'email', 'phone', 'notes']);
          return this.clients.put(c);
        }),
      ]);
    });
  }

  /**
   * Get or set application setting
   */
  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    const setting = await this.settings.get(key);
    return setting ? setting.value : defaultValue;
  }

  async setSetting<T = any>(key: string, value: T): Promise<void> {
    await this.settings.put({ key, value });
  }

  /**
   * Search across multiple tables
   */
  async globalSearch(query: string): Promise<{
    receipts: Receipt[];
    quotations: Quotation[];
    products: Product[];
    clients: Client[];
  }> {
    const searchTerms = this.normalizeSearchTerms(query);
    
    const [receipts, quotations, products, clients] = await Promise.all([
      this.receipts.where('searchTerms').anyOf(searchTerms).toArray(),
      this.quotations.where('searchTerms').anyOf(searchTerms).toArray(),
      this.products.where('searchTerms').anyOf(searchTerms).toArray(),
      this.clients.where('searchTerms').anyOf(searchTerms).toArray(),
    ]);

    return { receipts, quotations, products, clients };
  }

  private addSearchTerms(obj: any, fields: string[]): void {
    const searchTerms = new Set<string>();
    
    for (const field of fields) {
      const value = obj[field];
      if (value && typeof value === 'string') {
        const terms = this.normalizeSearchTerms(value);
        terms.forEach(term => searchTerms.add(term));
      }
    }
    
    obj.searchTerms = Array.from(searchTerms);
  }

  private normalizeSearchTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length >= 2)
      .slice(0, 50); // Limit to prevent index bloat
  }

  private serializeEntity(entity: any): any {
    // Convert class instances to plain objects
    if (entity && typeof entity.toJSON === 'function') {
      return entity.toJSON();
    }
    return { ...entity };
  }

  private deserializeEntity(data: any, type: string): any {
    // Convert dates back from ISO strings
    const dateFields = ['createdAt', 'updatedAt', 'completedAt', 'validUntil', 'processedAt', 'date', 'lastLogin'];
    
    for (const field of dateFields) {
      if (data[field] && typeof data[field] === 'string') {
        data[field] = new Date(data[field]);
      }
    }

    // Recreate class instances based on type
    switch (type) {
      case 'receipt':
        const receipt = Object.create(Receipt.prototype);
        return Object.assign(receipt, data);
      case 'quotation':
        const quotation = Object.create(Quotation.prototype);
        return Object.assign(quotation, data);
      case 'product':
        const product = Object.create(Product.prototype);
        return Object.assign(product, data);
      case 'client':
        const client = Object.create(Client.prototype);
        return Object.assign(client, data);
      case 'payment':
        const payment = Object.create(Payment.prototype);
        return Object.assign(payment, data);
      default:
        return data;
    }
  }

  private async estimateSize(): Promise<number> {
    try {
      // This is an approximation - IndexedDB doesn't provide exact size
      const stats = await this.getStats();
      const estimatedRecordSize = 1024; // 1KB per record estimate
      return (stats.receipts + stats.quotations + stats.products + stats.clients + stats.payments) * estimatedRecordSize;
    } catch {
      return 0;
    }
  }
}
