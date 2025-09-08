export interface IRepository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  findByIds(ids: TId[]): Promise<T[]>;
  save(entity: T): Promise<T>;
  saveMany(entities: T[]): Promise<T[]>;
  update(id: TId, updates: Partial<T>): Promise<T | null>;
  delete(id: TId): Promise<boolean>;
  deleteMany(ids: TId[]): Promise<number>;
  exists(id: TId): Promise<boolean>;
  count(): Promise<number>;
}

export interface IQueryRepository<T, TFilter = any> extends IRepository<T> {
  findByFilter(filter: TFilter): Promise<T[]>;
  findOneByFilter(filter: TFilter): Promise<T | null>;
  countByFilter(filter: TFilter): Promise<number>;
}

export interface IPaginatedRepository<T, TFilter = any> extends IQueryRepository<T, TFilter> {
  findPaginated(
    filter: TFilter,
    page: number,
    limit: number,
    sortBy?: keyof T,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>;
}

export abstract class BaseRepository<T extends { id: string }, TFilter = any>
  implements IPaginatedRepository<T, TFilter>
{
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract save(entity: T): Promise<T>;
  abstract update(id: string, updates: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract findByFilter(filter: TFilter): Promise<T[]>;

  async findByIds(ids: string[]): Promise<T[]> {
    const entities = await Promise.all(ids.map(id => this.findById(id)));
    return entities.filter((entity): entity is T => entity !== null);
  }

  async saveMany(entities: T[]): Promise<T[]> {
    return Promise.all(entities.map(entity => this.save(entity)));
  }

  async deleteMany(ids: string[]): Promise<number> {
    const results = await Promise.all(ids.map(id => this.delete(id)));
    return results.filter(result => result).length;
  }

  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  async count(): Promise<number> {
    const all = await this.findAll();
    return all.length;
  }

  async findOneByFilter(filter: TFilter): Promise<T | null> {
    const results = await this.findByFilter(filter);
    return results[0] || null;
  }

  async countByFilter(filter: TFilter): Promise<number> {
    const results = await this.findByFilter(filter);
    return results.length;
  }

  async findPaginated(
    filter: TFilter,
    page: number = 1,
    limit: number = 10,
    sortBy?: keyof T,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    let results = await this.findByFilter(filter);
    const total = results.length;

    // Sort if specified
    if (sortBy) {
      results.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = results.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
