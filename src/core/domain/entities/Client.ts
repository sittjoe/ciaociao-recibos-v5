import { v4 as uuidv4 } from 'uuid';

export interface ClientAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ClientContact {
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
}

export interface ClientPreferences {
  preferredPaymentMethod?: 'cash' | 'card' | 'check' | 'transfer';
  discountRate?: number;
  taxExempt?: boolean;
  notes?: string;
}

export class Client {
  public readonly id: string;
  public firstName: string;
  public lastName: string;
  public companyName: string | undefined;
  public isCompany: boolean;
  public contact: ClientContact;
  public address?: ClientAddress;
  public preferences: ClientPreferences;
  public totalPurchases: number;
  public totalQuotations: number;
  public lastPurchaseDate?: Date;
  public isActive: boolean;
  public tags: string[];
  public notes?: string;
  public email: string;
  public phone: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    firstName: string,
    lastName: string,
    contact: ClientContact,
    isCompany: boolean = false,
    companyName?: string
  ) {
    this.id = uuidv4();
    this.firstName = firstName;
    this.lastName = lastName;
    this.companyName = companyName;
    this.isCompany = isCompany;
    this.contact = contact;
    this.preferences = {};
    this.totalPurchases = 0;
    this.totalQuotations = 0;
    this.isActive = true;
    this.tags = [];
    this.email = contact.email || '';
    this.phone = contact.phone || contact.mobile || '';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public getDisplayName(): string {
    if (this.isCompany && this.companyName) {
      return this.companyName;
    }
    return `${this.firstName} ${this.lastName}`;
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public updateContact(contact: Partial<ClientContact>): void {
    this.contact = { ...this.contact, ...contact };
    if (contact.email) this.email = contact.email;
    if (contact.phone) this.phone = contact.phone;
    if (contact.mobile && !contact.phone) this.phone = contact.mobile;
    this.updatedAt = new Date();
  }

  public addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      this.updatedAt = new Date();
    }
  }

  public removeTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    this.tags = this.tags.filter(t => t !== normalizedTag);
    this.updatedAt = new Date();
  }

  public updateAddress(address: ClientAddress): void {
    this.address = address;
    this.updatedAt = new Date();
  }

  public updatePreferences(preferences: Partial<ClientPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.updatedAt = new Date();
  }

  public incrementPurchases(amount: number): void {
    this.totalPurchases += amount;
    this.lastPurchaseDate = new Date();
    this.updatedAt = new Date();
  }

  public incrementQuotations(): void {
    this.totalQuotations += 1;
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  public isVIPClient(vipThreshold: number = 10000): boolean {
    return this.totalPurchases >= vipThreshold;
  }

  public getFormattedAddress(): string {
    if (!this.address) return '';
    
    return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.postalCode}, ${this.address.country}`;
  }

  public getPrimaryContact(): string {
    return this.contact.email || this.contact.phone || this.contact.mobile || 'No contact info';
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      companyName: this.companyName,
      isCompany: this.isCompany,
      contact: this.contact,
      address: this.address,
      preferences: this.preferences,
      totalPurchases: this.totalPurchases,
      totalQuotations: this.totalQuotations,
      lastPurchaseDate: this.lastPurchaseDate?.toISOString(),
      isActive: this.isActive,
      tags: this.tags,
      email: this.email,
      phone: this.phone,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}