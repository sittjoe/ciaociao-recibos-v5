import { Client } from '../entities/Client.js';
import { IPaginatedRepository } from './base/IRepository.js';

export interface ClientFilter {
  search?: string;
  isActive?: boolean;
  hasOrders?: boolean;
  registrationDateFrom?: Date;
  registrationDateTo?: Date;
  city?: string;
  country?: string;
  tags?: string[];
}

export interface IClientRepository extends IPaginatedRepository<Client, ClientFilter> {
  findByEmail(email: string): Promise<Client | null>;
  findByPhone(phone: string): Promise<Client | null>;
  findActiveClients(): Promise<Client[]>;
  findInactiveClients(): Promise<Client[]>;
  findByCity(city: string): Promise<Client[]>;
  findByCountry(country: string): Promise<Client[]>;
  findByTags(tags: string[]): Promise<Client[]>;
  searchByName(query: string): Promise<Client[]>;
  getClientCount(): Promise<number>;
  getActiveClientCount(): Promise<number>;
  getNewClientsInDateRange(startDate: Date, endDate: Date): Promise<Client[]>;
}
