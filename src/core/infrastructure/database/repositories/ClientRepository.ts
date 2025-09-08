import { Injectable, Inject } from '../../di/index.js';
import { Client } from '../../../domain/entities/Client.js';
import { IClientRepository, ClientFilter } from '../../../domain/repositories/IClientRepository.js';
import { BaseRepository } from '../../../domain/repositories/base/IRepository.js';
import { DatabaseContext } from '../DatabaseContext.js';

@Injectable()
export class ClientRepository extends BaseRepository<Client, ClientFilter> implements IClientRepository {
  constructor(@Inject(DatabaseContext) private db: DatabaseContext) {
    super();
  }

  async findById(id: string): Promise<Client | null> {
    const client = await this.db.clients.get(id);
    return client || null;
  }

  async findAll(): Promise<Client[]> {
    return this.db.clients.orderBy('createdAt').reverse().toArray();
  }

  async save(entity: Client): Promise<Client> {
    await this.db.clients.put(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Client>): Promise<Client | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.clients.put(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleteCount = await this.db.clients.where('id').equals(id).delete();
    return deleteCount > 0;
  }

  async findByFilter(filter: ClientFilter): Promise<Client[]> {
    let query = this.db.clients.toCollection();

    if (filter.isActive !== undefined) {
      query = query.and(client => client.isActive === filter.isActive);
    }

    if (filter.registrationDateFrom) {
      query = query.and(client => client.createdAt >= filter.registrationDateFrom!);
    }

    if (filter.registrationDateTo) {
      query = query.and(client => client.createdAt <= filter.registrationDateTo!);
    }

    if (filter.city) {
      query = query.and(client => 
        client.address?.city?.toLowerCase().includes(filter.city!.toLowerCase())
      );
    }

    if (filter.country) {
      query = query.and(client => 
        client.address?.country?.toLowerCase().includes(filter.country!.toLowerCase())
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      query = query.and(client => 
        filter.tags!.some(tag => client.tags.includes(tag.toLowerCase()))
      );
    }

    if (filter.search) {
      const searchTerms = filter.search.toLowerCase().split(' ').filter(term => term.length >= 2);
      query = query.and(client => {
        const searchableText = [
          client.firstName,
          client.lastName,
          client.email,
          client.phone,
          client.notes,
          client.address?.street,
          client.address?.city,
          client.address?.state,
          client.address?.country,
          ...client.tags
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Note: hasOrders filter would require joining with receipts/quotations
    // This is a simplified implementation
    if (filter.hasOrders !== undefined) {
      // This would need to be implemented with a separate query to receipts/quotations
      // For now, we'll skip this filter
    }

    return query.reverse().sortBy('createdAt');
  }

  async findByEmail(email: string): Promise<Client | null> {
    const client = await this.db.clients.where('email').equals(email.toLowerCase()).first();
    return client || null;
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const client = await this.db.clients.where('phone').equals(phone).first();
    return client || null;
  }

  async findActiveClients(): Promise<Client[]> {
    return this.db.clients
      .where('isActive')
      .equals(true)
      .reverse()
      .sortBy('createdAt');
  }

  async findInactiveClients(): Promise<Client[]> {
    return this.db.clients
      .where('isActive')
      .equals(false)
      .reverse()
      .sortBy('createdAt');
  }

  async findByCity(city: string): Promise<Client[]> {
    const clients = await this.db.clients.toArray();
    return clients.filter(client => 
      client.address?.city?.toLowerCase() === city.toLowerCase()
    );
  }

  async findByCountry(country: string): Promise<Client[]> {
    const clients = await this.db.clients.toArray();
    return clients.filter(client => 
      client.address?.country?.toLowerCase() === country.toLowerCase()
    );
  }

  async findByTags(tags: string[]): Promise<Client[]> {
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const clients = await this.db.clients.toArray();
    
    return clients.filter(client => 
      normalizedTags.some(tag => client.tags.includes(tag))
    );
  }

  async searchByName(query: string): Promise<Client[]> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length >= 2);
    const clients = await this.db.clients.toArray();
    
    return clients.filter(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return searchTerms.every(term => fullName.includes(term));
    });
  }

  async getClientCount(): Promise<number> {
    return this.db.clients.count();
  }

  async getActiveClientCount(): Promise<number> {
    return this.db.clients
      .where('isActive')
      .equals(true)
      .count();
  }

  async getNewClientsInDateRange(startDate: Date, endDate: Date): Promise<Client[]> {
    return this.db.clients
      .where('createdAt')
      .between(startDate, endDate)
      .reverse()
      .sortBy('createdAt');
  }
}
